import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  PipelineBoard,
  type PipelineColumn,
  type PipelineLead,
} from "@/components/leads/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pipeline" };

const UNSET_COLUMN = -1;

export default async function PipelinePage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [statuses, leads] = await Promise.all([
    prisma.leadStatus.findMany({
      where: { ...scope, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.lead.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: { source: { select: { name: true } } },
    }),
  ]);

  const columns: PipelineColumn[] = [
    { id: UNSET_COLUMN, name: "No status", color: null },
    ...statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
    })),
  ];

  const boardLeads: PipelineLead[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    mobile: lead.mobile,
    source: lead.source?.name ?? null,
    followup: lead.nextFollowupAt?.toISOString() ?? null,
    statusId: lead.leadStatusId,
  }));

  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Drag leads between stages. Changes are saved instantly."
      />
      <PipelineBoard columns={columns} initialLeads={boardLeads} />
    </>
  );
}
