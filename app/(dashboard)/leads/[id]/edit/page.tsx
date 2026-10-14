import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { LeadForm, type LeadFormOptionsData } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/layout/page-header";
import { toDateTimeLocal } from "@/lib/format";
import type { LeadFormData } from "@/lib/validations/lead";
import { getLeadFormOptions } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit lead" };

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) notFound();

  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [lead, raw] = await Promise.all([
    prisma.lead.findFirst({ where: { id: leadId, ...scope } }),
    getLeadFormOptions(organizationId),
  ]);

  if (!lead) notFound();

  const options: LeadFormOptionsData = {
    statuses: raw.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      subStatuses: s.subStatuses.map((sub) => ({ id: sub.id, name: sub.name })),
    })),
    sources: raw.sources.map((s) => ({ id: s.id, name: s.name })),
    types: raw.types.map((t) => ({ id: t.id, name: t.name })),
    institutes: raw.institutes.map((i) => ({
      id: i.id,
      name: i.name,
      programs: i.programs.map((p) => ({ id: p.id, name: p.name })),
    })),
    users: raw.users.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    })),
    campaigns: raw.campaigns.map((c) => ({ id: c.id, name: c.name })),
  };

  const initialValues: LeadFormData = {
    name: lead.name ?? "",
    mobile: lead.mobile,
    alternateMobile: lead.alternateMobile ?? "",
    email: lead.email ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    country: lead.country ?? "",
    instituteId: lead.instituteId ? String(lead.instituteId) : "",
    programmeId: lead.programmeId ? String(lead.programmeId) : "",
    leadSourceId: lead.leadSourceId ? String(lead.leadSourceId) : "",
    typeId: lead.typeId ? String(lead.typeId) : "",
    leadStatusId: lead.leadStatusId ? String(lead.leadStatusId) : "",
    leadSubStatusId: lead.leadSubStatusId ? String(lead.leadSubStatusId) : "",
    campaignId: lead.campaignId ? String(lead.campaignId) : "",
    leadAssignTo: lead.leadAssignTo ? String(lead.leadAssignTo) : "",
    nextFollowupAt: toDateTimeLocal(lead.nextFollowupAt),
    note: "",
  };

  return (
    <>
      <PageHeader
        title={`Edit: ${lead.name || lead.mobile}`}
        description="Update the lead's information."
      />
      <LeadForm options={options} initialValues={initialValues} leadId={lead.id} />
    </>
  );
}
