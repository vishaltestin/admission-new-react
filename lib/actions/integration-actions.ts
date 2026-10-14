"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import {
  PROVIDERS,
  providerFormSchema,
  webhookFormSchema,
} from "@/lib/validations/integrations";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const providerEnum = z.enum(PROVIDERS);

/* ---------------------------------------------------------------------------
 * Provider integrations (credentials + enable)
 * ------------------------------------------------------------------------- */

export async function saveProviderIntegration(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const input = z
    .object({ provider: providerEnum, data: providerFormSchema })
    .safeParse(values);
  if (!input.success) {
    return fail("Please fix the errors below", input.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const { provider, data } = input.data;

  try {
    await prisma.leadIntegration.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      update: { isEnabled: data.isEnabled },
      create: { organizationId, provider, isEnabled: data.isEnabled },
    });

    await prisma.leadIntegrationCredential.deleteMany({
      where: { organizationId, provider, NOT: { key: "webhook_token" } },
    });
    if (data.credentials.length > 0) {
      await prisma.leadIntegrationCredential.createMany({
        data: data.credentials.map((cred) => ({
          organizationId,
          provider,
          key: cred.key,
          value: cred.value,
        })),
      });
    }
    revalidatePath("/integrations");
    return ok("Integration saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the integration.");
  }
}

export async function regenerateWebhookToken(provider: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!providerEnum.safeParse(provider).success) return fail("Unknown provider.");
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const token = randomBytes(24).toString("hex");
    await prisma.leadIntegrationCredential.deleteMany({
      where: { organizationId, provider, key: "webhook_token" },
    });
    await prisma.leadIntegrationCredential.create({
      data: { organizationId, provider, key: "webhook_token", value: token },
    });
    // Also ensure the integration row exists.
    await prisma.leadIntegration.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      update: {},
      create: { organizationId, provider, isEnabled: false },
    });
    revalidatePath("/integrations");
    return ok("Webhook token regenerated");
  } catch (error) {
    console.error(error);
    return fail("Could not regenerate the token.");
  }
}

/* ---------------------------------------------------------------------------
 * Outgoing webhooks
 * ------------------------------------------------------------------------- */

function parseJsonObject(raw: string | undefined): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function createWebhook(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = webhookFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const webhook = await prisma.webhook.create({
      data: {
        organizationId,
        name: parsed.data.name,
        entityType: parsed.data.entityType,
        description: parsed.data.description || null,
        method: parsed.data.method,
        endPoint: parsed.data.endPoint,
        headers: parseJsonObject(parsed.data.headersJson),
        queryParams: parseJsonObject(parsed.data.queryParamsJson),
        payloadType: "json",
        rawPayloadType: "json",
      },
    });
    revalidatePath("/integrations");
    return ok("Webhook created", { id: webhook.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the webhook.");
  }
}

export async function updateWebhook(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = webhookFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.webhook.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        entityType: parsed.data.entityType,
        description: parsed.data.description || null,
        method: parsed.data.method,
        endPoint: parsed.data.endPoint,
        headers: parseJsonObject(parsed.data.headersJson),
        queryParams: parseJsonObject(parsed.data.queryParamsJson),
      },
    });
    revalidatePath("/integrations");
    return ok("Webhook updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the webhook.");
  }
}

export async function deleteWebhook(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.webhook.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/integrations");
    return ok("Webhook deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the webhook.");
  }
}
