/**
 * Shared webform submission pipeline. Used by the public server action AND
 * the CORS-enabled embed endpoint. No session assumptions — public traffic.
 */
import { runAutomationRules } from "@/lib/automation/engine";
import { CORE_FIELDS } from "@/lib/validations/webforms";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type IngestResult = {
  ok: boolean;
  error?: string;
  leadId?: number;
};

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z]/g, "");

export async function ingestWebFormSubmission(
  formId: string,
  raw: Record<string, unknown>,
): Promise<IngestResult> {
  const form = await prisma.webForm.findFirst({
    where: { formId },
    include: { attributes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!form) return { ok: false, error: "Form not found" };

  // Server-side validation driven by the attribute definitions.
  const values: Record<string, string> = {};
  for (const attr of form.attributes) {
    const key = `f_${attr.id}`;
    let value = raw[key];
    if (Array.isArray(value)) value = value.join(", ");
    const text = String(value ?? "").trim();
    if (attr.isRequired && !text) {
      return { ok: false, error: `"${attr.name}" is required` };
    }
    if (text && attr.type === "email" && !/^\S+@\S+\.\S+$/.test(text)) {
      return { ok: false, error: `"${attr.name}" must be a valid email` };
    }
    values[attr.id] = text;
  }

  // Split into core lead fields and extra answers.
  const core: Record<string, string> = {};
  const extras: Record<string, string> = {};
  for (const attr of form.attributes) {
    const text = values[attr.id];
    if (!text) continue;
    const coreKey = CORE_FIELDS[normalize(attr.name)];
    if (coreKey) core[coreKey] = text;
    else extras[attr.name] = text;
  }

  let leadId: number | undefined;

  if (form.createLead) {
    if (!core.mobile) {
      return {
        ok: false,
        error: "This form is not accepting submissions right now.",
      };
    }

    const duplicate = await prisma.lead.findFirst({
      where: { organizationId: form.organizationId, mobile: core.mobile },
      select: { id: true },
    });

    if (duplicate) {
      leadId = duplicate.id;
      // Refresh: append the new answers to the extra fields of the existing lead.
      const existing = await prisma.lead.findUnique({
        where: { id: duplicate.id },
        select: { extraFields: true },
      });
      const current =
        existing?.extraFields && typeof existing.extraFields === "object"
          ? (existing.extraFields as Record<string, unknown>)
          : {};
      await prisma.lead.update({
        where: { id: duplicate.id },
        data: {
          extraFields: {
            ...current,
            ...extras,
            [`webform_${form.formId}`]: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      await prisma.leadActivityLog.create({
        data: {
          leadId: duplicate.id,
          action: "webform_resubmitted",
          details: { form: form.title, formId: form.formId },
        },
      });
    } else {
      const lead = await prisma.lead.create({
        data: {
          name: core.name || null,
          mobile: core.mobile,
          email: core.email || null,
          city: core.city || null,
          state: core.state || null,
          country: core.country || null,
          organizationId: form.organizationId,
          leadSourceId: form.leadSourceId,
          campaignId: form.campaignId,
          typeId: form.typeId,
          extraFields: {
            ...extras,
            [`webform_${form.formId}`]: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      leadId = lead.id;
      await prisma.leadActivityLog.create({
        data: {
          leadId: lead.id,
          action: "webform_submitted",
          details: { form: form.title, formId: form.formId },
        },
      });
      void runAutomationRules("lead_created", lead.id);
    }
  }

  await prisma.webForm.update({
    where: { id: form.id },
    data: { submitCount: { increment: 1 } },
  });

  return { ok: true, leadId };
}
