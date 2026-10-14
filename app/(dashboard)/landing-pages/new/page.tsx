import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { LandingPageForm } from "@/components/landing-pages/landing-pages-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New landing page" };

export default async function NewLandingPagePage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [campaigns, webforms] = await Promise.all([
    prisma.campaign.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.webForm.findMany({ where: scope, orderBy: { title: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="New landing page" description="Compose the sections — preview it live after saving." />
      <LandingPageForm
        initial={null}
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
        webforms={webforms.map((w) => ({ id: w.id, name: w.title }))}
      />
    </>
  );
}
