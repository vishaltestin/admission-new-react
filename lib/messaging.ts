/**
 * Internal (non-action) message delivery core.
 * Used by the send-message server action AND the automation engine,
 * so it never reads the session — callers pass ids explicitly.
 */
import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";
import { leadTemplateContext, renderTemplate } from "@/lib/render-template";

export type DeliveryChannel = "email" | "sms" | "whatsapp";

export type DeliveryResult = {
  status: "sent" | "queued" | "failed";
  message: string;
};

export async function deliverMessage(args: {
  organizationId: number;
  leadId: number;
  channel: DeliveryChannel;
  templateId?: number | null;
  subject?: string | null;
  /** Pre-rendered when provided; otherwise rendered from the template. */
  message?: string;
  sentBy: number | null;
}): Promise<DeliveryResult> {
  const { organizationId, leadId, channel, templateId, sentBy } = args;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { status: true, assignee: true, institute: true, programme: true },
  });
  if (!lead) return { status: "failed", message: "Lead not found" };

  let subject = args.subject ?? null;
  let body = args.message ?? "";
  let templateTitle: string | null = null;

  if (!body && templateId) {
    const context = leadTemplateContext(lead);
    if (channel === "email") {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return { status: "failed", message: "Template not found" };
      subject = subject ?? renderTemplate(template.subject ?? "", context);
      body = renderTemplate(template.message, context);
      templateTitle = template.title;
      await prisma.emailTemplate.update({
        where: { id: templateId },
        data: { sentCount: { increment: 1 } },
      });
    } else if (channel === "sms") {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return { status: "failed", message: "Template not found" };
      body = renderTemplate(template.message, context);
      templateTitle = template.title;
      await prisma.messageTemplate.update({
        where: { id: templateId },
        data: { sentCount: { increment: 1 } },
      });
    } else {
      const template = await prisma.whatsappTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return { status: "failed", message: "Template not found" };
      body = renderTemplate(template.message, context);
      templateTitle = template.title;
      await prisma.whatsappTemplate.update({
        where: { id: templateId },
        data: { sentCount: { increment: 1 } },
      });
    }
  }

  if (!body) return { status: "failed", message: "Empty message body" };
  if (channel === "email" && !lead.email) {
    return { status: "failed", message: "Lead has no email address" };
  }

  const commLog = await prisma.leadCommunicationLog.create({
    data: {
      leadId: lead.id,
      channel,
      direction: "outbound",
      purpose: templateId ? "template_message" : "manual_message",
    },
  });

  let status: DeliveryResult["status"] = "queued";
  let provider = "manual";
  let responseMessage = "No provider configured – recorded as queued.";

  if (channel === "email") {
    const settings = await prisma.emailSetting.findUnique({
      where: { organizationId },
    });
    if (settings?.mailHost && settings.status === 1) {
      provider = "smtp";
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
        const info = await transporter.sendMail({
          from: settings.mailFromName
            ? `"${settings.mailFromName}" <${settings.mailFromAddress ?? settings.mailUsername}>`
            : (settings.mailFromAddress ?? settings.mailUsername ?? undefined),
          to: lead.email!,
          subject: subject ?? "(no subject)",
          text: body,
          html: body.replace(/\n/g, "<br>"),
        });
        status = "sent";
        responseMessage = `messageId: ${info.messageId}`;
      } catch (error) {
        status = "failed";
        responseMessage = error instanceof Error ? error.message : "SMTP error";
      }
    }

    await prisma.emailLog.create({
      data: {
        communicationLogId: commLog.id,
        organizationId,
        leadId: lead.id,
        templateName: templateTitle,
        toEmail: lead.email,
        subject,
        body,
        status,
        responseMessage,
        provider,
        sentBy,
        attempts: 1,
        sentAt: status === "sent" ? new Date() : null,
        lastAttemptAt: new Date(),
      },
    });
  } else if (channel === "sms") {
    await prisma.smsLog.create({
      data: {
        communicationLogId: commLog.id,
        organizationId,
        leadId: lead.id,
        mobile: lead.mobile,
        message: body,
        provider,
        status,
        responseJson: responseMessage,
        sentBy,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    });
  } else {
    await prisma.whatsappLog.create({
      data: {
        communicationLogId: commLog.id,
        organizationId,
        leadId: lead.id,
        mobile: lead.mobile,
        templateId: templateId ? String(templateId) : null,
        message: body,
        provider,
        status,
        responseJson: responseMessage,
        sentBy,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    });
  }

  return { status, message: responseMessage };
}
