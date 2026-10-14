import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  CampaignsTab,
  MarketingEventsTab,
  type CampaignRow,
  type MarketingEventRow,
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

  const [campaigns, events] = await Promise.all([
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
  ]);

  const campaignRows: CampaignRow[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    type: campaign.type,
    status: campaign.status,
    marketingEventId: campaign.marketingEventId,
    marketingEventName: campaign.marketingEvent?.name ?? null,
    leadCount: campaign._count.leads,
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
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <MarketingEventsTab rows={eventRows} />
        </TabsContent>
      </Tabs>
    </>
  );
}
