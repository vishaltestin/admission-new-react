import type { Metadata } from "next";

import { auth } from "@/auth";
import { LeadForm, type LeadFormOptionsData } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/layout/page-header";
import { getLeadFormOptions } from "@/lib/queries";

export const metadata: Metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const raw = await getLeadFormOptions(organizationId);

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

  return (
    <>
      <PageHeader
        title="New lead"
        description="Add a lead manually to the CRM."
      />
      <LeadForm options={options} />
    </>
  );
}
