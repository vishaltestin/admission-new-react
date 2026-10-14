import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { WebformCreateForm } from "@/components/webforms/webforms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New webform" };

export default async function NewWebformPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [sources, campaigns, types] = await Promise.all([
    prisma.leadSource.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.leadType.findMany({ where: scope, orderBy: { name: "asc" } }),
  ]);

  const toOptions = (rows: { id: number; name: string | null }[]) =>
    rows.map((r) => ({ id: r.id, name: r.name ?? `#${r.id}` }));

  return (
    <>
      <PageHeader
        title="New webform"
        description="Create a capture form — leads land straight in the CRM."
      />
      <WebformCreateForm
        sources={toOptions(sources)}
        campaigns={toOptions(campaigns)}
        types={toOptions(types)}
      />
    </>
  );
}
