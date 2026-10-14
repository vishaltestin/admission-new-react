import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  IntegrationsClient,
  type OutgoingWebhookRow,
  type ProviderState,
  type WebhookLogRow,
} from "@/components/integrations/integrations-client";
import { PageHeader } from "@/components/layout/page-header";
import { PROVIDERS } from "@/lib/validations/integrations";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [integrations, credentials, webhooks, logs, emailSetting] = await Promise.all([
    prisma.leadIntegration.findMany({ where: scope }),
    prisma.leadIntegrationCredential.findMany({
      where: scope,
      orderBy: { key: "asc" },
    }),
    prisma.webhook.findMany({ where: scope, orderBy: { updatedAt: "desc" } }),
    prisma.leadWebhookLog.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    organizationId != null
      ? prisma.emailSetting.findUnique({ where: { organizationId } })
      : Promise.resolve(null),
  ]);

  const providers: ProviderState[] = PROVIDERS.map((provider) => {
    const integration = integrations.find((i) => i.provider === provider);
    const own = credentials.filter((c) => c.provider === provider);
    return {
      provider,
      isEnabled: integration?.isEnabled ?? false,
      token: own.find((c) => c.key === "webhook_token")?.value ?? null,
      credentials: own
        .filter((c) => c.key !== "webhook_token" && c.key !== "default_assign_to")
        .map((c) => ({ key: c.key, value: c.value })),
    };
  });

  const webhookRows: OutgoingWebhookRow[] = webhooks.map((w) => ({
    id: w.id,
    name: w.name,
    entityType: w.entityType,
    description: w.description,
    method: w.method,
    endPoint: w.endPoint,
    headersJson: w.headers ? JSON.stringify(w.headers, null, 2) : "",
    queryParamsJson: w.queryParams ? JSON.stringify(w.queryParams, null, 2) : "",
  }));

  const logRows: WebhookLogRow[] = logs.map((log) => ({
    id: log.id,
    provider: log.provider,
    eventType: log.eventType,
    isProcessed: log.isProcessed,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
    payloadPreview: JSON.stringify(log.payload).slice(0, 160),
  }));

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect lead sources (Facebook, Instagram, Google) and manage outgoing webhooks."
      />
      <IntegrationsClient
        providers={providers}
        webhooks={webhookRows}
        logs={logRows}
        emailSettings={
          emailSetting
            ? {
                mailHost: emailSetting.mailHost,
                mailPort: emailSetting.mailPort,
                mailUsername: emailSetting.mailUsername,
                mailEncryption: emailSetting.mailEncryption,
                mailFromAddress: emailSetting.mailFromAddress,
                mailFromName: emailSetting.mailFromName,
                active: emailSetting.status === 1,
              }
            : null
        }
      />
    </>
  );
}
