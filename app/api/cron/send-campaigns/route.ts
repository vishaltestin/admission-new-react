/**
 * Scheduled campaign sender.
 *
 * Trigger every minute (Vercel Cron or `curl`-from-cron) with a bearer token:
 *
 *   Authorization: Bearer $CRON_SECRET
 *
 * It dispatches campaigns whose `scheduled_at` has passed and whose status is
 * still "scheduled". Batched: up to 10 campaigns per invocation.
 */
import { NextRequest, NextResponse } from "next/server";

import { dispatchCampaign } from "@/lib/campaign-dispatch";
import { prisma } from "@/lib/prisma";

async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
    select: { id: true, name: true },
  });

  const results: { id: number; name: string; [key: string]: unknown }[] = [];
  for (const campaign of due) {
    const result = await dispatchCampaign(campaign.id);
    results.push({ id: campaign.id, name: campaign.name, ...result });
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    dispatched: results.length,
    results,
  });
}

export const GET = handler;
export const POST = handler;
