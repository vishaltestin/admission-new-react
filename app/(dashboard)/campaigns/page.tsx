import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  CampaignsTab,
  MarketingEventsTab,
  type CampaignRow,
  type MarketingEventRow,
  type TemplateOptions,
} from "@/components/campaigns/campaigns-client";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Campaigns" };

function toDateInput(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export default async function CampaignsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [campaigns, events, emailTemplates, smsTemplates, whatsappTemplates, statuses] =
    await Promise.all([
      prisma.campaign.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        include: {
          marketingEvent: true,
          _count: { select: { leads: true } },
        },
      }),
      prisma.marketingEvent.findMany({
        where: scope,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { campaigns: true } } },
      }),
      prisma.emailTemplate.findMany({
        where: scope,
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.messageTemplate.findMany({
        where: scope,
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.whatsappTemplate.findMany({
        where: scope,
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.leadStatus.findMany({
        where: scope,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const templateNames = new Map<number | null, string>();
  emailTemplates.forEach((t) => templateNames.set(t.id, t.title ?? `Email #${t.id}`));
  smsTemplates.forEach((t) => templateNames.set(t.id, t.title ?? `SMS #${t.id}`));
  whatsappTemplates.forEach((t) => templateNames.set(t.id, t.title ?? `WhatsApp #${t.id}`));

  const templates: TemplateOptions = {
    email: emailTemplates.map((t) => ({ id: t.id, name: t.title ?? `Email #${t.id}` })),
    sms: smsTemplates.map((t) => ({ id: t.id, name: t.title ?? `SMS #${t.id}` })),
    whatsapp: whatsappTemplates.map((t) => ({ id: t.id, name: t.title ?? `WhatsApp #${t.id}` })),
  };

  const campaignRows: CampaignRow[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    type: campaign.type,
    status: campaign.status,
    marketingEventId: campaign.marketingEventId,
    marketingEventName: campaign.marketingEvent?.name ?? null,
    leadCount: campaign._count.leads,
    channel: campaign.channel,
    templateId: campaign.templateId,
    templateName: campaign.templateId
      ? (templateNames.get(campaign.templateId) ?? `Template #${campaign.templateId}`)
      : null,
    audienceStatusId: campaign.audienceStatusId,
    scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
    dispatchedLeadCount: campaign.dispatchedLeadCount,
    lastError: campaign.lastError,
  }));

  const eventRows: MarketingEventRow[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    date: toDateInput(event.date),
    campaignCount: event._count.campaigns,
  }));

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Plan campaigns and the marketing events behind them."
      />
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="events">Marketing events</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsTab
            rows={campaignRows}
            events={events.map((event) => ({ id: event.id, name: event.name }))}
            templates={templates}
            statuses={statuses.map((s) => ({ id: s.id, name: s.name ?? `#${s.id}` }))}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <MarketingEventsTab rows={eventRows} />
        </TabsContent>
      </Tabs>
    </>
  );
}
