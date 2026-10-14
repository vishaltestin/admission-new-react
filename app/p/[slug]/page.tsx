import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WebformRenderer } from "@/components/public/webform-renderer";
import { prisma } from "@/lib/prisma";

type SectionContent = Record<string, unknown>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.landingPage.findFirst({
    where: { slug, status: 1 },
    select: { title: true, meta: true },
  });
  const metaTitle =
    page?.meta && typeof page.meta === "object"
      ? (page.meta as Record<string, unknown>).title
      : undefined;
  return { title: (metaTitle as string) || page?.title || "Welcome" };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await prisma.landingPage.findFirst({
    where: { slug, status: 1 },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) notFound();

  void prisma.landingPage.update({
    where: { id: page.id },
    data: { viewCount: { increment: 1 } },
  });

  const section = (key: string): SectionContent => {
    const found = page.sections.find((s) => s.sectionKey === key);
    return found && typeof found.contentJson === "object"
      ? (found.contentJson as SectionContent)
      : {};
  };

  const hero = section("hero");
  const features = (section("features").items as { title: string; text?: string }[]) ?? [];
  const about = section("about");
  const formSection = section("form");

  const webform =
    typeof formSection.webformId === "number"
      ? await prisma.webForm.findFirst({
          where: { id: formSection.webformId },
          include: { attributes: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* hero */}
      <section
        className="relative flex items-center justify-center bg-neutral-900 px-4 py-24 text-center text-white"
        style={
          hero.imageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${String(hero.imageUrl)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {String(hero.heading || page.title || "Welcome")}
          </h1>
          {hero.subheading ? (
            <p className="mt-4 text-lg text-neutral-200">{String(hero.subheading)}</p>
          ) : null}
          {hero.ctaLabel && hero.ctaUrl ? (
            <a
              href={String(hero.ctaUrl)}
              className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-100"
            >
              {String(hero.ctaLabel)}
            </a>
          ) : null}
        </div>
      </section>

      {/* features */}
      {features.length ? (
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="rounded-lg border border-neutral-200 p-6">
                <h3 className="font-semibold">{feature.title}</h3>
                {feature.text ? (
                  <p className="mt-2 text-sm text-neutral-600">{feature.text}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* about */}
      {about.text ? (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <p className="whitespace-pre-line text-neutral-700">{String(about.text)}</p>
        </section>
      ) : null}

      {/* capture form */}
      {webform ? (
        <section id="apply" className="bg-neutral-50 px-4 py-16">
          <div className="flex justify-center">
            <WebformRenderer
              headingsLevel="h2"
              form={{
                formId: webform.formId,
                title: webform.title,
                description: webform.description,
                submitButtonLabel: webform.submitButtonLabel,
                submitSuccessAction: webform.submitSuccessAction,
                submitSuccessContent: webform.submitSuccessContent,
                backgroundColor: webform.backgroundColor,
                formBackgroundColor: webform.formBackgroundColor,
                formTitleColor: webform.formTitleColor,
                formSubmitButtonColor: webform.formSubmitButtonColor,
                attributeLabelColor: webform.attributeLabelColor,
              }}
              attributes={webform.attributes.map((a) => ({
                id: a.id,
                name: a.name,
                placeholder: a.placeholder,
                type: a.type,
                options: a.options,
                defaultValue: a.defaultValue,
                isRequired: a.isRequired,
                isHidden: a.isHidden,
              }))}
            />
          </div>
        </section>
      ) : null}

      <footer className="border-t border-neutral-200 px-4 py-6 text-center text-xs text-neutral-400">
        {page.title ?? ""}
      </footer>
    </main>
  );
}
