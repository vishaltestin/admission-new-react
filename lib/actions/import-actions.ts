"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, requireUser, type ActionResult } from "@/lib/action-utils";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 1000;

const rowSchema = z.object({
  name: z.string().max(150).optional(),
  mobile: z
    .string()
    .min(1)
    .regex(/^[0-9+\-\s]{7,20}$/),
  alternateMobile: z.string().max(20).optional(),
  email: z.string().email().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  note: z.string().max(5000).optional(),
});

type CsvRow = z.infer<typeof rowSchema> & {
  sourceName?: string;
  statusName?: string;
  typeName?: string;
};

/** Minimal RFC4180-ish CSV parser (quotes, escaped quotes, commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const HEADER_MAP: Record<string, string> = {
  name: "name",
  fullname: "name",
  leadname: "name",
  mobile: "mobile",
  phone: "mobile",
  phonenumber: "mobile",
  mobilenumber: "mobile",
  contact: "mobile",
  alternatemobile: "alternateMobile",
  alternatemobilenumber: "alternateMobile",
  email: "email",
  mail: "email",
  emailid: "email",
  city: "city",
  state: "state",
  country: "country",
  source: "sourceName",
  leadsource: "sourceName",
  status: "statusName",
  leadstatus: "statusName",
  type: "typeName",
  leadtype: "typeName",
  note: "note",
  notes: "note",
};

export type ImportSummary = {
  uploadId: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  failures: { row: number; mobile: string; name: string; reason: string }[];
};

export async function importLeadsFromCsv(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Please choose a CSV file to import.");
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return fail("Only .csv files are supported.", { file: ["Must be a .csv file"] });
  }
  if (file.size > 2 * 1024 * 1024) {
    return fail("File is too large (max 2 MB).");
  }

  const defaultStatusId = Number(formData.get("leadStatusId")) || null;
  const assignToId = Number(formData.get("leadAssignTo")) || null;
  const defaultSourceId = Number(formData.get("leadSourceId")) || null;

  const organizationId =
    user.organizationId ??
    (await prisma.organization.findFirst({ orderBy: { id: "asc" } }))?.id ??
    null;
  if (!organizationId) return fail("No organization found.");

  const text = await file.text();
  const grid = parseCsv(text).filter((r) => r.some((f) => f.trim() !== ""));
  if (grid.length < 2) {
    return fail("The CSV has no data rows.", {
      file: ["Expected a header row plus at least one data row"],
    });
  }

  const headers = grid[0].map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const columnFor: Record<string, number> = {};
  headers.forEach((header, index) => {
    const mapped = HEADER_MAP[header];
    if (mapped && columnFor[mapped] === undefined) {
      columnFor[mapped] = index;
    }
  });
  if (columnFor.mobile === undefined) {
    return fail("Could not find a mobile column in the CSV header.", {
      file: ["Add a 'mobile' column (also accepted: phone, contact)"],
    });
  }

  const dataRows = grid.slice(1);
  if (dataRows.length > MAX_ROWS) {
    return fail(`Too many rows (${dataRows.length}). Maximum ${MAX_ROWS} per import.`);
  }

  // Masters for name-based mapping.
  const [sources, statuses, types] = await Promise.all([
    prisma.leadSource.findMany({ where: { organizationId } }),
    prisma.leadStatus.findMany({ where: { organizationId } }),
    prisma.leadType.findMany({ where: { organizationId } }),
  ]);
  const findByName = <T extends { id: number; name: string }>(list: T[], value?: string) =>
    value
      ? list.find((item) => item.name.toLowerCase() === value.trim().toLowerCase())
          ?.id ?? null
      : null;

  // Create the upload record up-front (status: processing).
  const upload = await prisma.leadUpload.create({
    data: {
      organizationId,
      userId: user.id,
      fileName: file.name,
      totalRows: dataRows.length,
      status: "processing",
      startedAt: new Date(),
    },
  });

  const failures: ImportSummary["failures"] = [];
  const validRows: CsvRow[] = [];
  const seenMobiles = new Set<string>();
  let duplicateCount = 0;

  for (const [index, raw] of dataRows.entries()) {
    const rowNumber = index + 2; // 1-based + header
    const cell = (key: string) =>
      columnFor[key] !== undefined ? raw[columnFor[key]]?.trim() ?? "" : "";

    const candidate: CsvRow = {
      name: cell("name") || undefined,
      mobile: cell("mobile").replace(/\s/g, ""),
      alternateMobile: cell("alternateMobile") || undefined,
      email: cell("email") || undefined,
      city: cell("city") || undefined,
      state: cell("state") || undefined,
      country: cell("country") || undefined,
      note: cell("note") || undefined,
      sourceName: cell("sourceName") || undefined,
      statusName: cell("statusName") || undefined,
      typeName: cell("typeName") || undefined,
    };

    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failures.push({
        row: rowNumber,
        mobile: candidate.mobile,
        name: candidate.name ?? "",
        reason: `${issue.path.join(".") || "row"}: ${issue.message}`,
      });
      continue;
    }

    if (seenMobiles.has(candidate.mobile)) {
      duplicateCount++;
      continue;
    }
    seenMobiles.add(candidate.mobile);
    validRows.push(parsed.data as CsvRow);
  }

  // DB duplicates (by mobile within the organization).
  const mobiles = validRows.map((r) => r.mobile);
  const existing = await prisma.lead.findMany({
    where: { organizationId, mobile: { in: mobiles } },
    select: { mobile: true },
  });
  const existingMobiles = new Set(existing.map((e) => e.mobile));

  const toInsert = validRows.filter((r) => {
    if (existingMobiles.has(r.mobile)) {
      duplicateCount++;
      return false;
    }
    return true;
  });

  const PROG = { leadsPerTick: 200 };
  let imported = 0;
  const sourceUsage = new Map<number, number>();

  for (let index = 0; index < toInsert.length; index += PROG.leadsPerTick) {
    const chunk = toInsert.slice(index, index + PROG.leadsPerTick);
    await prisma.lead.createMany({
      data: chunk.map((row) => {
        const sourceId =
          findByName(sources, row.sourceName) ?? defaultSourceId ?? null;
        if (sourceId) {
          sourceUsage.set(sourceId, (sourceUsage.get(sourceId) ?? 0) + 1);
        }
        return {
          organizationId,
          name: row.name ?? null,
          mobile: row.mobile,
          alternateMobile: row.alternateMobile ?? null,
          email: row.email ?? null,
          city: row.city ?? null,
          state: row.state ?? null,
          country: row.country ?? null,
          leadSourceId: sourceId,
          leadStatusId:
            findByName(statuses, row.statusName) ?? defaultStatusId ?? null,
          typeId: findByName(types, row.typeName),
          leadAssignTo: assignToId,
          createdBy: user.id,
          leadRegistrationDate: new Date(),
        };
      }),
    });
    imported += chunk.length;
  }

  // Keep source lead counters roughly in sync.
  for (const [sourceId, count] of sourceUsage) {
    await prisma.leadSource.update({
      where: { id: sourceId },
      data: { leadCount: { increment: count } },
    });
  }

  const status =
    failures.length === 0 ? "completed" : imported > 0 ? "partial" : "failed";

  await prisma.leadUpload.update({
    where: { id: upload.id },
    data: {
      status,
      validRows: imported,
      failedRows: failures.length,
      duplicateRows: duplicateCount,
      completedAt: new Date(),
      errorMessage:
        failures.length > 50
          ? `${failures.length} rows failed. First 50 reasons are shown in the UI.`
          : null,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/leads/import");

  return ok(`Imported ${imported} lead(s)`, {
    uploadId: upload.id,
    total: dataRows.length,
    imported,
    duplicates: duplicateCount,
    failed: failures.length,
    failures: failures.slice(0, 50),
  });
}
