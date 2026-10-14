"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import { generalSettingsFormSchema } from "@/lib/validations/settings";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

export async function saveGeneralSettings(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = generalSettingsFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  let credentials: Prisma.InputJsonValue | undefined;
  if (parsed.data.paymentCredentialsJson?.trim()) {
    try {
      credentials = JSON.parse(parsed.data.paymentCredentialsJson);
    } catch {
      return fail("Payment credentials must be valid JSON.", {
        paymentCredentialsJson: ["Invalid JSON"],
      });
    }
  }

  try {
    const data = {
      organizationId,
      appName: parsed.data.appName || null,
      currency: parsed.data.currency || null,
      timezone: parsed.data.timezone || null,
      dateFormat: parsed.data.dateFormat || null,
      logo: parsed.data.logo || null,
      favicon: parsed.data.favicon || null,
      defaultGateway: parsed.data.defaultGateway || null,
      paymentCredentials: credentials ?? Prisma.JsonNull,
      maintenanceMode: parsed.data.maintenanceMode ? 1 : 0,
      maintenanceMessage: parsed.data.maintenanceMessage || null,
    };
    await prisma.generalSetting.upsert({
      where: { organizationId },
      update: data,
      create: data,
    });
    revalidatePath("/settings");
    return ok("Settings saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the settings.");
  }
}
