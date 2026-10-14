import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsPagination } from "@/components/leads/pagination";
import { LeadsTable, type LeadRow } from "@/components/leads/leads-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getLeadFormOptions } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Leads" };

const PAGE_SIZE = 15;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const q = params.q?.trim() ?? "";
  const statusId = Number(params.status) || null;
  const sourceId = Number(params.source) || null;
  const typeId = Number(params.type) || null;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.LeadWhereInput = {
    ...scope,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { mobile: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
    ...(statusId ? { leadStatusId: statusId } : {}),
    ...(sourceId ? { leadSourceId: sourceId } : {}),
    ...(typeId ? { typeId } : {}),
  };

  const [total, leads, options] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        status: { select: { name: true, color: true } },
        subStatus: { select: { name: true, color: true } },
        source: { select: { name: true } },
        type: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
    }),
    getLeadFormOptions(organizationId),
  ]);

  const rows: LeadRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    mobile: lead.mobile,
    email: lead.email,
    city: lead.city,
    createdAt: lead.createdAt.toISOString(),
    nextFollowupAt: lead.nextFollowupAt?.toISOString() ?? null,
    status: lead.status,
    subStatus: lead.subStatus,
    source: lead.source,
    type: lead.type,
    assignee: lead.assignee
      ? {
          name: [lead.assignee.firstName, lead.assignee.lastName]
            .filter(Boolean)
            .join(" "),
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Manage and track all your leads in one place."
        actions={
          <Button asChild>
            <Link href="/leads/new">
              <Plus />
              Add lead
            </Link>
          </Button>
        }
      />

      <LeadFilters
        statuses={options.statuses.map((s) => ({ id: s.id, name: s.name }))}
        sources={options.sources.map((s) => ({ id: s.id, name: s.name }))}
        types={options.types.map((t) => ({ id: t.id, name: t.name }))}
      />

      <LeadsTable leads={rows} />

      <LeadsPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        searchParams={params}
      />
    </>
  );
}
