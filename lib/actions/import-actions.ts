"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { z } from "zod";

import { fail, ok, requireUser, type ActionResult } from "@/lib/action-utils";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/action-utils";

const MAX_ROWS = 1000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

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

export type ImportSummary = {
  uploadId: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  failures: { row: number; mobile: string; name: string; reason: string }[];
};

/* ------------------------------- parsing -------------------------------- */

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

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** Reads .csv, .xlsx and .xls into a trim-normalized grid of strings. */
async function parseSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 2 MB).");
  }
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(await file.text());
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("The spreadsheet has no sheets.");
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    return grid.map((row) => row.map((cell) => String(cell ?? "").trim()));
  }
  throw new Error("Only .csv, .xlsx and .xls files are supported.");
}

/* --------------------------- header suggestion -------------------------- */

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

/** Target fields the mapping UI offers (order-matters for the UI). */
export const IMPORT_TARGETS = [
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile (required)" },
  { key: "alternateMobile", label: "Alternate mobile" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "sourceName", label: "Source (name)" },
  { key: "statusName", label: "Status (name)" },
  { key: "typeName", label: "Type (name)" },
  { key: "note", label: "Note" },
] as const;
export type ImportTargetKey = (typeof IMPORT_TARGETS)[number]["key"];

function suggestMapping(headers: string[]): Record<string, string> {
  const suggestion: Record<string, string> = {};
  const used = new Set<string>();
  for (const header of headers) {
    const target = HEADER_MAP[normalizeHeader(header)];
    if (target && !used.has(target) && !suggestion[target]) {
      suggestion[target] = header;
      used.add(target);
    }
  }
  return suggestion;
}

/* ------------------------------- the engine ----------------------------- */

async function executeImport(args: {
  user: SessionUser;
  organizationId: number;
  fileName: string;
  grid: string[][];
  columnFor: Record<string, number>;
  defaults: { leadStatusId: number | null; leadSourceId: number | null; leadAssignTo: number | null };
}): Promise<ActionResult<ImportSummary>> {
  const { user, organizationId, fileName, grid, columnFor, defaults } = args;
  const dataRows = grid.slice(1).filter((r) => r.some((f) => f.trim() !== ""));
  if (dataRows.length === 0) {
    return fail("The file has no data rows.", {
      file: ["Expected a header row plus at least one data row"],
    });
  }
  if (dataRows.length > MAX_ROWS) {
    return fail(`Too many rows (${dataRows.length}). Maximum ${MAX_ROWS} per import.`);
  }

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

  const upload = await prisma.leadUpload.create({
    data: {
      organizationId,
      userId: user.id,
      fileName,
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

  let imported = 0;
  const sourceUsage = new Map<number, number>();

  for (let index = 0; index < toInsert.length; index += 200) {
    const chunk = toInsert.slice(index, index + 200);
    await prisma.lead.createMany({
      data: chunk.map((row) => {
        const sourceId = findByName(sources, row.sourceName) ?? defaults.leadSourceId ?? null;
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
          leadStatusId: findByName(statuses, row.statusName) ?? defaults.leadStatusId ?? null,
          typeId: findByName(types, row.typeName),
          leadAssignTo: defaults.leadAssignTo,
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

  const status = failures.length === 0 ? "completed" : imported > 0 ? "partial" : "failed";

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

async function resolveOrg(user: SessionUser) {
  return (
    user.organizationId ??
    (await prisma.organization.findFirst({ orderBy: { id: "asc" } }))?.id ??
    null
  );
}

function readDefaults(formData: FormData) {
  return {
    leadStatusId: Number(formData.get("leadStatusId")) || null,
    leadAssignTo: Number(formData.get("leadAssignTo")) || null,
    leadSourceId: Number(formData.get("leadSourceId")) || null,
  };
}

/* -------------------------------- actions ------------------------------- */

/** Legacy one-step import: auto-detect columns from header aliases (CSV). */
export async function importLeadsFromCsv(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Please choose a file to import.");
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return fail("Only .csv files are supported for the quick import.", {
      file: ["Use the mapping importer for .xlsx/.xls files"],
    });
  }
  if (file.size > MAX_FILE_BYTES) {
    return fail("File is too large (max 2 MB).");
  }

  const organizationId = await resolveOrg(user);
  if (!organizationId) return fail("No organization found.");

  const defaults = readDefaults(formData);
  const text = await file.text();
  const grid = parseCsv(text).filter((r) => r.some((f) => f.trim() !== ""));
  if (grid.length < 2) {
    return fail("The CSV has no data rows.", {
      file: ["Expected a header row plus at least one data row"],
    });
  }

  const headers = grid[0].map(normalizeHeader);
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

  return executeImport({
    user,
    organizationId,
    fileName: file.name,
    grid,
    columnFor,
    defaults,
  });
}

/* ---------------------------- preview + mapped --------------------------- */

export type ImportPreview = {
  fileName: string;
  rowCount: number;
  headers: string[];
  sample: string[][];
  suggested: Record<string, string>;
};

/** Step 1: parse the file and propose a column mapping (.csv/.xlsx/.xls). */
export async function previewImport(
  formData: FormData,
): Promise<ActionResult<ImportPreview>> {
  const user = await requireUser();
  void user;
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Please choose a file to import.");
  }

  let grid: string[][];
  try {
    grid = await parseSpreadsheet(file);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not read the file.", {
      file: [error instanceof Error ? error.message : "Unreadable file"],
    });
  }
  grid = grid.filter((r) => r.some((f) => f.trim() !== ""));
  if (grid.length < 2) {
    return fail("The file has no data rows.", {
      file: ["Expected a header row plus at least one data row"],
    });
  }

  const headers = grid[0].map((h) => h.trim());
  return ok("Preview ready", {
    fileName: file.name,
    rowCount: grid.length - 1,
    headers,
    sample: grid.slice(1, 6).map((row) =>
      headers.map((_, index) => row[index] ?? ""),
    ),
    suggested: suggestMapping(headers),
  });
}

const mappingSchema = z.record(z.string(), z.string());

/** Step 2: import using the explicit column mapping chosen by the user. */
export async function runMappedImport(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const user = await requireUser();
  const organizationId = await resolveOrg(user);
  if (!organizationId) return fail("No organization found.");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Please choose a file to import.");
  }
  const mappingRaw = formData.get("mapping");
  const mappingParsed = mappingSchema.safeParse(
    typeof mappingRaw === "string" ? JSON.parse(mappingRaw || "{}") : {},
  );
  if (!mappingParsed.success) return fail("Invalid mapping.");
  const mapping = mappingParsed.data;
  if (!(mapping.mobile ?? "").trim()) {
    return fail("Map the Mobile column before importing.", { mapping: ["Mobile is required"] });
  }

  let grid: string[][];
  try {
    grid = await parseSpreadsheet(file);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not read the file.");
  }
  grid = grid.filter((r) => r.some((f) => f.trim() !== ""));
  if (grid.length < 2) {
    return fail("The file has no data rows.");
  }

  const headers = grid[0].map((h) => h.trim());
  const columnFor: Record<string, number> = {};
  for (const target of IMPORT_TARGETS) {
    const chosen = mapping[target.key];
    if (!chosen) continue;
    const index = headers.indexOf(chosen);
    if (index >= 0 && columnFor[target.key] === undefined) {
      columnFor[target.key] = index;
    }
  }

  return executeImport({
    user,
    organizationId,
    fileName: file.name,
    grid,
    columnFor,
    defaults: readDefaults(formData),
  });
}
