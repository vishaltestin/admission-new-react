/**
 * Direct outbound mail helper (no lead/campaign coupling) — used for OTP and
 * system mail. Reads the organization's SMTP settings; gracefully degrades
 * to "not configured" so callers can decide how to continue.
 */
import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

export type MailResult = { ok: boolean; configured: boolean; error?: string };

export async function sendOrgMail(
  organizationId: number,
  args: { to: string; subject: string; text: string },
): Promise<MailResult> {
  const settings = await prisma.emailSetting.findUnique({
    where: { organizationId },
  });
  if (!settings?.mailHost || settings.status !== 1) {
    return { ok: false, configured: false };
  }
  try {
    const port = Number(settings.mailPort) || 587;
    const transporter = nodemailer.createTransport({
      host: settings.mailHost,
      port,
      secure: port === 465 || settings.mailEncryption === "ssl",
      auth: settings.mailUsername
        ? { user: settings.mailUsername, pass: settings.mailPassword ?? "" }
        : undefined,
      tls: { rejectUnauthorized: settings.mailValidateSsl === 1 },
    });
    await transporter.sendMail({
      from: settings.mailFromName
        ? `"${settings.mailFromName}" <${settings.mailFromAddress ?? settings.mailUsername}>`
        : (settings.mailFromAddress ?? settings.mailUsername ?? undefined),
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "SMTP error",
    };
  }
}
