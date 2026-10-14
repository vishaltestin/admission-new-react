"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import { landingPageFormSchema } from "@/lib/validations/landing";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const num = (v: string | undefined) => {
  if (!v || v === "none") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function sectionsFor(data: {
  heroHeading?: string;
  heroSubheading?: string;
  heroCtaLabel?: string;
  heroCtaUrl?: string;
  heroImageUrl?: string;
  aboutText?: string;
  webformId?: string;
  features: { title: string; text?: string }[];
}) {
  return [
    {
      sectionKey: "hero",
      sortOrder: 0,
      contentJson: {
        heading: data.heroHeading || "",
        subheading: data.heroSubheading || "",
        ctaLabel: data.heroCtaLabel || "",
        ctaUrl: data.heroCtaUrl || "",
        imageUrl: data.heroImageUrl || "",
      },
    },
    {
      sectionKey: "features",
      sortOrder: 1,
      contentJson: { items: data.features.filter((f) => f.title.trim()) },
    },
    { sectionKey: "about", sortOrder: 2, contentJson: { text: data.aboutText || "" } },
    {
      sectionKey: "form",
      sortOrder: 3,
      contentJson: { webformId: num(data.webformId) },
    },
  ];
}

export async function createLandingPage(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = landingPageFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  // Slugs must be globally unique — public URLs resolve by slug alone.
  const clash = await prisma.landingPage.findFirst({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (clash) return fail("This slug is already used.", { slug: ["Pick a different slug"] });

  try {
    const page = await prisma.landingPage.create({
      data: {
        organizationId,
        slug: parsed.data.slug,
        title: parsed.data.title,
        status: parsed.data.published ? 1 : 0,
        campaignId: num(parsed.data.campaignId),
        meta: { title: parsed.data.title },
      },
    });
    await prisma.landingPageSection.createMany({
      data: sectionsFor(parsed.data).map((s) => ({ ...s, pageId: page.id })),
    });
    revalidatePath("/landing-pages");
    return ok("Landing page created", { id: page.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the landing page.");
  }
}

export async function updateLandingPage(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = landingPageFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const existing = await prisma.landingPage.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) return fail("Landing page not found.");
  const clash = await prisma.landingPage.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return fail("This slug is already used.", { slug: ["Pick a different slug"] });

  try {
    await prisma.$transaction([
      prisma.landingPage.update({
        where: { id },
        data: {
          slug: parsed.data.slug,
          title: parsed.data.title,
          status: parsed.data.published ? 1 : 0,
          campaignId: num(parsed.data.campaignId),
          meta: { title: parsed.data.title },
        },
      }),
      prisma.landingPageSection.deleteMany({ where: { pageId: id } }),
      prisma.landingPageSection.createMany({
        data: sectionsFor(parsed.data).map((s) => ({ ...s, pageId: id })),
      }),
    ]);
    revalidatePath("/landing-pages");
    revalidatePath(`/landing-pages/${id}`);
    return ok("Landing page saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the landing page.");
  }
}

export async function deleteLandingPage(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.landingPage.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/landing-pages");
    return ok("Landing page deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the landing page.");
  }
}
