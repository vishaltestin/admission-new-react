import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationWizard } from "@/components/public/application-wizard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Application form",
  robots: { index: false, follow: false },
};

export default async function PublicApplicationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const form = await prisma.applicationForm.findFirst({
    where: { uniqueCode: code, status: 1 },
  });
  if (!form) notFound();

  // Allowed options (empty arrays = unrestricted).
  const allowedCountries = Array.isArray(form.allowedCountries)
    ? (form.allowedCountries as string[]).filter(Boolean)
    : [];
  const allowedInstitutes = Array.isArray(form.allowedInstitutes)
    ? (form.allowedInstitutes as number[])
    : [];

  const [countries, institutes] = await Promise.all([
    allowedCountries.length
      ? Promise.resolve(allowedCountries)
      : prisma.country
          .findMany({ select: { name: true }, orderBy: { name: "asc" } })
          .then((rows) => rows.map((r) => r.name ?? "").filter(Boolean)),
    prisma.institute.findMany({
      where: {
        organizationId: form.organizationId,
        ...(allowedInstitutes.length ? { id: { in: allowedInstitutes } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const fees = form.fees != null ? Number(form.fees) : 0;
  const taxPercent = form.tax != null ? Number(form.tax) : 0;
  const total =
    form.totalAmount != null && Number(form.totalAmount) > 0
      ? Number(form.totalAmount)
      : Math.round(fees * (1 + taxPercent / 100) * 100) / 100;

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-100 p-4 pt-10">
      <ApplicationWizard
        code={form.uniqueCode}
        title={form.title ?? "Application form"}
        description={form.description}
        fee={fees}
        taxPercent={taxPercent}
        total={total}
        countries={countries}
        institutes={institutes}
      />
    </main>
  );
}
