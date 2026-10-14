import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  LandingPagesTable,
  type LandingPageRow,
} from "@/components/landing-pages/landing-pages-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Landing pages" };

export default async function LandingPagesPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const pages = await prisma.landingPage.findMany({
    where: scope,
    orderBy: { updatedAt: "desc" },
  });

  const rows: LandingPageRow[] = pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    published: page.status === 1,
    viewCount: page.viewCount,
  }));

  return (
    <>
      <PageHeader
        title="Landing pages"
        description="Public campaign pages that capture leads through embedded webforms."
      />
      <LandingPagesTable rows={rows} />
    </>
  );
}
