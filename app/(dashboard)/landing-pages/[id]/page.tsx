import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  LandingPageForm,
  type LandingPageInitial,
} from "@/components/landing-pages/landing-pages-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit landing page" };

export default async function EditLandingPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  if (!Number.isInteger(pageId)) notFound();

  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [page, campaigns, webforms] = await Promise.all([
    prisma.landingPage.findFirst({
      where: { id: pageId, ...scope },
      include: { sections: true },
    }),
    prisma.campaign.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.webForm.findMany({ where: scope, orderBy: { title: "asc" } }),
  ]);
  if (!page) notFound();

  const section = (key: string): Record<string, unknown> => {
    const found = page.sections.find((s) => s.sectionKey === key);
    return found && typeof found.contentJson === "object"
      ? (found.contentJson as Record<string, unknown>)
      : {};
  };
  const hero = section("hero");
  const features = section("features");
  const about = section("about");
  const formSection = section("form");
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const noneOr = (value: number | null | undefined) => (value ? String(value) : "none");

  const initial: LandingPageInitial = {
    id: page.id,
    slugOriginal: page.slug,
    title: page.title ?? "",
    slug: page.slug,
    campaignId: noneOr(page.campaignId),
    published: page.status === 1,
    heroHeading: str(hero.heading),
    heroSubheading: str(hero.subheading),
    heroCtaLabel: str(hero.ctaLabel),
    heroCtaUrl: str(hero.ctaUrl),
    heroImageUrl: str(hero.imageUrl),
    aboutText: str(about.text),
    webformId: noneOr(formSection.webformId as number | undefined),
    features: Array.isArray(features.items)
      ? (features.items as { title?: unknown; text?: unknown }[]).map((item) => ({
          title: str(item.title),
          text: str(item.text),
        }))
      : [],
  };

  return (
    <>
      <PageHeader
        title={`Edit — ${page.title ?? page.slug}`}
        description={`Published at /p/${page.slug} · ${page.viewCount} views`}
      />
      <LandingPageForm
        initial={initial}
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
        webforms={webforms.map((w) => ({ id: w.id, name: w.title }))}
      />
    </>
  );
}
