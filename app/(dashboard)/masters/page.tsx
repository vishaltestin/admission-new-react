import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  InstitutesTab,
  ProgramsTab,
  SourcesTab,
  StatusesTab,
  SubStatusesTab,
  TypesTab,
  type InstituteRow,
  type ProgramRow,
  type SourceRow,
  type StatusRow,
  type SubStatusRow,
  type TypeRow,
} from "@/components/masters/masters-client";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Lead Masters" };

export default async function MastersPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [statuses, subStatuses, sources, types, institutes, programs] =
    await Promise.all([
      prisma.leadStatus.findMany({
        where: scope,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { subStatuses: true, leads: true } },
        },
      }),
      prisma.leadSubStatus.findMany({
        where: scope,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { status: true },
      }),
      prisma.leadSource.findMany({
        where: scope,
        orderBy: { name: "asc" },
      }),
      prisma.leadType.findMany({ where: scope, orderBy: { name: "asc" } }),
      prisma.institute.findMany({
        where: scope,
        orderBy: { name: "asc" },
        include: { _count: { select: { programs: true } } },
      }),
      prisma.program.findMany({
        orderBy: { name: "asc" },
        include: { institute: true },
      }),
    ]);

  const statusRows: StatusRow[] = statuses.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
    subStatusCount: s._count.subStatuses,
    leadCount: s._count.leads,
  }));

  const subStatusRows: SubStatusRow[] = subStatuses.map((s) => ({
    id: s.id,
    name: s.name,
    leadStatusId: s.leadStatusId,
    statusName: s.status.name,
    color: s.color,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
  }));

  const sourceRows: SourceRow[] = sources.map((s) => ({
    id: s.id,
    name: s.name,
    leadCount: s.leadCount,
    billingSetupAmount: Number(s.billingSetupAmount),
    status: s.status === 1,
  }));

  const typeRows: TypeRow[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status === 1,
  }));

  const instituteRows: InstituteRow[] = institutes.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    status: i.status === 1,
    programCount: i._count.programs,
  }));

  const programRows: ProgramRow[] = programs.map((p) => ({
    id: p.id,
    name: p.name,
    instituteId: p.instituteId,
    instituteName: p.institute.name,
    description: p.description,
    status: p.status === 1,
  }));

  const statusOptions = statuses.map((s) => ({ id: s.id, name: s.name }));
  const instituteOptions = institutes.map((i) => ({ id: i.id, name: i.name }));

  return (
    <>
      <PageHeader
        title="Lead Masters"
        description="Configure the dropdowns and classifications used across the CRM."
      />

      <Tabs defaultValue="statuses">
        <TabsList className="flex-wrap">
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="sub-statuses">Sub-statuses</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="institutes">Institutes</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="mt-4">
          <StatusesTab rows={statusRows} />
        </TabsContent>
        <TabsContent value="sub-statuses" className="mt-4">
          <SubStatusesTab rows={subStatusRows} statuses={statusOptions} />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <SourcesTab rows={sourceRows} />
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          <TypesTab rows={typeRows} />
        </TabsContent>
        <TabsContent value="institutes" className="mt-4">
          <InstitutesTab rows={instituteRows} />
        </TabsContent>
        <TabsContent value="programs" className="mt-4">
          <ProgramsTab rows={programRows} institutes={instituteOptions} />
        </TabsContent>
      </Tabs>
    </>
  );
}
