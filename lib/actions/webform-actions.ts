"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import {
  ATTRIBUTE_TYPES,
  slugify,
  webformBuilderFormSchema,
  webformFormSchema,
} from "@/lib/validations/webforms";
import { ingestWebFormSubmission, type IngestResult } from "@/lib/webform-ingest";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const num = (v: string | undefined) => {
  if (!v || v === "none") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const color = (v: string | undefined | null) => (v?.trim() ? v : null);

/** Globally-unique slug (the public URL resolves by formId alone). */
async function uniqueFormId(title: string, exceptId?: number) {
  const base = slugify(title) || "form";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate =
      attempt === 0 ? base : attempt === 1 ? `${base}-${randomBytes(2).toString("hex")}` : `${base}-${attempt}`;
    const clash = await prisma.webForm.findFirst({
      where: { formId: candidate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export async function createWebForm(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = webformFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const form = await prisma.webForm.create({
      data: {
        organizationId,
        formId: await uniqueFormId(parsed.data.title),
        title: parsed.data.title,
        description: parsed.data.description || null,
        submitButtonLabel: parsed.data.submitButtonLabel,
        submitSuccessAction: parsed.data.submitSuccessAction,
        submitSuccessContent: parsed.data.submitSuccessContent || null,
        createLead: parsed.data.createLead,
        leadSourceId: num(parsed.data.leadSourceId),
        campaignId: num(parsed.data.campaignId),
        typeId: num(parsed.data.typeId),
        backgroundColor: color(parsed.data.backgroundColor),
        formBackgroundColor: color(parsed.data.formBackgroundColor),
        formTitleColor: color(parsed.data.formTitleColor),
        formSubmitButtonColor: color(parsed.data.formSubmitButtonColor),
        attributeLabelColor: color(parsed.data.attributeLabelColor),
        createdBy: user.id,
      },
    });
    revalidatePath("/webforms");
    return ok("Webform created — now add its fields", { id: form.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the webform.");
  }
}

export async function updateWebForm(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = webformBuilderFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  try {
    const existing = await prisma.webForm.findFirst({
      where: { id, ...orgScope(user) },
      select: { id: true },
    });
    if (!existing) return fail("Webform not found.");

    await prisma.$transaction([
      prisma.webForm.update({
        where: { id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description || null,
          submitButtonLabel: parsed.data.submitButtonLabel,
          submitSuccessAction: parsed.data.submitSuccessAction,
          submitSuccessContent: parsed.data.submitSuccessContent || null,
          createLead: parsed.data.createLead,
          leadSourceId: num(parsed.data.leadSourceId),
          campaignId: num(parsed.data.campaignId),
          typeId: num(parsed.data.typeId),
          backgroundColor: color(parsed.data.backgroundColor),
          formBackgroundColor: color(parsed.data.formBackgroundColor),
          formTitleColor: color(parsed.data.formTitleColor),
          formSubmitButtonColor: color(parsed.data.formSubmitButtonColor),
          attributeLabelColor: color(parsed.data.attributeLabelColor),
        },
      }),
      prisma.webFormAttribute.deleteMany({ where: { webFormId: id } }),
      prisma.webFormAttribute.createMany({
        data: parsed.data.attributes.map((attr, index) => ({
          webFormId: id,
          name: attr.name,
          placeholder: attr.placeholder || null,
          type: ATTRIBUTE_TYPES.includes(attr.type) ? attr.type : "text",
          options: attr.options || null,
          defaultValue: attr.defaultValue || null,
          isRequired: attr.isRequired,
          isHidden: attr.isHidden,
          sortOrder: index,
        })),
      }),
    ]);
    revalidatePath("/webforms");
    revalidatePath(`/webforms/${id}`);
    return ok("Webform saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the webform.");
  }
}

export async function deleteWebForm(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.webForm.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/webforms");
    return ok("Webform deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the webform.");
  }
}

/* -------- public submission (no session — embedded + standalone) -------- */

export async function submitWebForm(
  formId: string,
  values: Record<string, unknown>,
): Promise<IngestResult> {
  try {
    return await ingestWebFormSubmission(formId, values);
  } catch (error) {
    console.error("submitWebForm failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
