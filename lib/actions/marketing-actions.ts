"use server";

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
  campaignSchema,
  marketingEventSchema,
} from "@/lib/validations/marketing";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function createCampaign(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = campaignSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: parsed.data.name,
        subject: parsed.data.subject ?? null,
        type: parsed.data.type ?? null,
        status: parsed.data.status ?? "draft",
        marketingEventId: parsed.data.marketingEventId ?? null,
      },
    });
    revalidatePath("/campaigns");
    return ok("Campaign created", { id: campaign.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the campaign.");
  }
}

export async function updateCampaign(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = campaignSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.campaign.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        subject: parsed.data.subject ?? null,
        type: parsed.data.type ?? null,
        status: parsed.data.status ?? null,
        marketingEventId: parsed.data.marketingEventId ?? null,
      },
    });
    revalidatePath("/campaigns");
    return ok("Campaign updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the campaign.");
  }
}

export async function deleteCampaign(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { campaignId: id } });
    if (usage > 0) {
      return fail(`This campaign is linked to ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.campaign.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/campaigns");
    return ok("Campaign deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the campaign.");
  }
}

// ---------------------------------------------------------------------------
// Marketing events
// ---------------------------------------------------------------------------

export async function createMarketingEvent(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = marketingEventSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const event = await prisma.marketingEvent.create({
      data: {
        organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        date: parsed.data.date ? new Date(parsed.data.date) : null,
      },
    });
    revalidatePath("/campaigns");
    return ok("Marketing event created", { id: event.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the marketing event.");
  }
}

export async function updateMarketingEvent(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = marketingEventSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.marketingEvent.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        date: parsed.data.date ? new Date(parsed.data.date) : null,
      },
    });
    revalidatePath("/campaigns");
    return ok("Marketing event updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the marketing event.");
  }
}

export async function deleteMarketingEvent(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.campaign.count({ where: { marketingEventId: id } });
    if (usage > 0) {
      return fail(`This event is linked to ${usage} campaign(s) and cannot be deleted.`);
    }
    await prisma.marketingEvent.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/campaigns");
    return ok("Marketing event deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the marketing event.");
  }
}
