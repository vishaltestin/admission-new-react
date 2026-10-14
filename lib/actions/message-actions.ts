"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  fail,
  ok,
  requireUser,
  type ActionResult,
} from "@/lib/action-utils";
import { deliverMessage } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  leadId: z.number().int().positive(),
  channel: z.enum(["email", "sms", "whatsapp"]),
  templateId: z.number().int().positive().nullish(),
  subject: z.string().max(255).optional(),
  message: z.string().min(1, "Message cannot be empty").max(20000),
});

/**
 * Sends (or queues) a message to a lead. Email goes out over SMTP when the
 * organization's email settings are configured; SMS/WhatsApp are queued
 * for provider integration. Everything lands in the channel logs.
 */
export async function sendLeadMessage(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = sendSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const { leadId, channel, templateId, subject, message } = parsed.data;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return fail("Lead not found.");
  if (user.organizationId != null && lead.organizationId !== user.organizationId) {
    return fail("Lead not found.");
  }
  if (channel === "email" && !lead.email) {
    return fail("This lead has no email address.");
  }

  const result = await deliverMessage({
    organizationId: lead.organizationId,
    leadId: lead.id,
    channel,
    templateId,
    subject,
    message,
    sentBy: user.id,
  });

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/logs");

  if (result.status === "failed") {
    return fail(`Send failed: ${result.message}`);
  }
  return ok(
    result.status === "sent"
      ? "Message sent"
      : "Message queued (configure a provider to send it for real)",
  );
}

/* ---------------------------------------------------------------------------
 * Email (SMTP) settings
 * ------------------------------------------------------------------------- */

const emailSettingsSchema = z.object({
  mailHost: z.string().max(100).optional().nullable(),
  mailPort: z.string().max(20).optional().nullable(),
  mailUsername: z.string().max(100).optional().nullable(),
  mailPassword: z.string().max(255).optional().nullable(),
  mailEncryption: z.string().max(10).optional().nullable(),
  mailFromAddress: z.string().max(100).optional().nullable(),
  mailFromName: z.string().max(100).optional().nullable(),
  status: z.boolean().default(true),
});

export async function saveEmailSettings(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = emailSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  const organizationId =
    user.organizationId ??
    (await prisma.organization.findFirst({ orderBy: { id: "asc" } }))?.id ??
    null;
  if (!organizationId) return fail("No organization found.");

  try {
    const existing = await prisma.emailSetting.findUnique({
      where: { organizationId },
    });

    const data = {
      organizationId,
      mailMailer: "smtp",
      mailHost: parsed.data.mailHost || null,
      mailPort: parsed.data.mailPort || null,
      mailUsername: parsed.data.mailUsername || null,
      // Blank password keeps the previous one.
      mailPassword:
        parsed.data.mailPassword === undefined ||
        parsed.data.mailPassword === null ||
        parsed.data.mailPassword === ""
          ? (existing?.mailPassword ?? null)
          : parsed.data.mailPassword,
      mailEncryption: parsed.data.mailEncryption || null,
      mailFromAddress: parsed.data.mailFromAddress || null,
      mailFromName: parsed.data.mailFromName || null,
      status: parsed.data.status ? 1 : 0,
    };

    await prisma.emailSetting.upsert({
      where: { organizationId },
      update: data,
      create: data,
    });
    revalidatePath("/templates");
    return ok("Email settings saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the email settings.");
  }
}
