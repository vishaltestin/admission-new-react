/**
 * Campaign dispatch engine — shared by the manual "Send now" action and the
 * scheduled-sender cron route. Sends the campaign's channel template to all
 * eligible audience leads via the existing lib/messaging pipeline.
 */
import { deliverMessage } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export type DispatchResult = {
  ok: boolean;
  error?: string;
  sent: number;
  queued: number;
  failed: number;
  channel: string;
};

const CHANNELS = ["email", "sms", "whatsapp"] as const;
export type CampaignChannel = (typeof CHANNELS)[number];

/** Execute one campaign. Sets status → dispatched with the lead count. */
export async function dispatchCampaign(
  campaignId: number,
): Promise<DispatchResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  const base: Omit<DispatchResult, "ok | error" | "ok"> & { channel: string } = {
    sent: 0,
    queued: 0,
    failed: 0,
    channel: campaign?.channel ?? "email",
  };

  if (!campaign) {
    return { ...base, ok: false, error: `Campaign ${campaignId} not found` };
  }
  if (campaign.status === "dispatched") {
    return { ...base, ok: false, error: "Campaign already dispatched" };
  }

  const channel = (campaign.channel ?? "email") as CampaignChannel;
  if (!CHANNELS.includes(channel)) {
    return { ...base, ok: false, error: `Unknown channel "${campaign.channel}"` };
  }
  if (!campaign.templateId) {
    return { ...base, ok: false, error: "No template picked for this campaign" };
  }

  // Audience: org leads with the channel's address on file; optional status filter.
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: campaign.organizationId,
      ...(campaign.audienceStatusId
        ? { leadStatusId: campaign.audienceStatusId }
        : {}),
      ...(channel === "email" ? { email: { not: null } } : { mobile: { not: "" } }),
    },
    orderBy: { id: "asc" },
    take: 2000,
    select: { id: true },
  });

  const result = { ...base, sent: 0, queued: 0, failed: 0 };
  for (const lead of leads) {
    try {
      const delivery = await deliverMessage({
        organizationId: campaign.organizationId,
        leadId: lead.id,
        channel,
        templateId: campaign.templateId,
        sentBy: null,
      });
      if (delivery.status === "sent") result.sent += 1;
      else if (delivery.status === "queued") result.queued += 1;
      else result.failed += 1;
    } catch {
      result.failed += 1;
    }
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "dispatched",
      dispatchedAt: new Date(),
      dispatchedLeadCount: result.sent + result.queued,
      lastError:
        result.failed > 0
          ? `${result.failed} lead(s) failed — check communication logs`
          : null,
    },
  });

  return { ...result, ok: result.failed < leads.length, channel };
}
