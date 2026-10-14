import { NextRequest, NextResponse } from "next/server";

import { runAutomationRules } from "@/lib/automation/engine";
import { ingestPayloadSchema, PROVIDERS } from "@/lib/validations/integrations";
import { prisma } from "@/lib/prisma";

/**
 * Public inbound-lead endpoint. Providers POST lead data here with the
 * per-organization token:
 *
 *   POST /api/integrations/ingest/{provider}?token=XXXX
 *
 * Body (JSON, extra keys are kept in the raw payload log):
 *   { name, mobile, email?, city?, state?, country?, source?, notes? }
 */

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

async function handle(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return json({ ok: false, error: "unknown provider" }, 404);
  }

  const token =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-webhook-token") ??
    "";
  if (!token) return json({ ok: false, error: "missing token" }, 401);

  // Token identifies both the organization and the provider account.
  const credential = await prisma.leadIntegrationCredential.findFirst({
    where: { provider, key: "webhook_token", value: token },
  });
  if (!credential) return json({ ok: false, error: "invalid token" }, 401);

  const organizationId = credential.organizationId;
  const integration = await prisma.leadIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!integration?.isEnabled) {
    return json({ ok: false, error: "integration disabled" }, 403);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: "body must be JSON" }, 400);
  }

  const parsed = ingestPayloadSchema.safeParse(raw);
  // Always keep a raw audit trail, even for bad payloads.
  const log = await prisma.leadWebhookLog.create({
    data: {
      organizationId,
      provider,
      eventType: "ingest",
      requestHeaders: {
        "content-type": request.headers.get("content-type"),
        "user-agent": request.headers.get("user-agent"),
      },
      payload: (parsed.success ? parsed.data : raw ?? {}) as object,
    },
  });

  if (!parsed.success) {
    await prisma.leadWebhookLog.update({
      where: { id: log.id },
      data: { errorMessage: "payload validation failed" },
    });
    return json({ ok: false, error: "invalid payload" }, 422);
  }
  const data = parsed.data;

  const name = (data.name ?? data.full_name ?? "").trim() || null;
  const mobile = (data.mobile ?? data.phone ?? data.phone_number ?? "").trim();
  if (!mobile) {
    await prisma.leadWebhookLog.update({
      where: { id: log.id },
      data: { errorMessage: "mobile is required" },
    });
    return json({ ok: false, error: "mobile is required" }, 422);
  }

  // Duplicate check within the organization.
  const existing = await prisma.lead.findFirst({
    where: { organizationId, mobile },
    select: { id: true },
  });
  if (existing) {
    await prisma.leadWebhookLog.update({
      where: { id: log.id },
      data: { errorMessage: `duplicate of lead #${existing.id}` },
    });
    return json({ ok: true, duplicate: true, leadId: existing.id });
  }

  // Resolve a named source (e.g. "Facebook Ads") to a lead master.
  let leadSourceId: number | null = null;
  const sourceName = (data.source ?? data.source_name ?? "").trim();
  if (sourceName) {
    const sources = await prisma.leadSource.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const match = sources.find(
      (s) => s.name.toLowerCase() === sourceName.toLowerCase(),
    );
    leadSourceId = match?.id ?? null;
  }

  // Default assignee: integration credential "default_assign_to" (optional).
  const assignCredential = await prisma.leadIntegrationCredential.findFirst({
    where: { organizationId, provider, key: "default_assign_to" },
  });
  const leadAssignTo = assignCredential ? Number(assignCredential.value) || null : null;

  const lead = await prisma.lead.create({
    data: {
      name,
      mobile,
      email: data.email || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      organizationId,
      leadSourceId,
      leadAssignTo,
      extraFields: { webhookLogId: log.id, provider, sourceName: sourceName || null },
    },
  });

  await prisma.leadWebhookLog.update({
    where: { id: log.id },
    data: { isProcessed: true },
  });

  void runAutomationRules("lead_created", lead.id);

  return json({ ok: true, leadId: lead.id }, 201);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  return handle(request, context);
}

// Facebook/Google lead-ads verification pings use GET.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const mode = request.nextUrl.searchParams.get("hub.mode");
  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return json({ ok: true, provider });
}
