import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppFormEditor,
  type AppFormInitial,
} from "@/components/application-forms/application-forms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit application form" };

export default async function EditApplicationFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formId = Number(id);
  if (!Number.isInteger(formId)) notFound();

  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [form, institutes, countries] = await Promise.all([
    prisma.applicationForm.findFirst({ where: { id: formId, ...scope } }),
    prisma.institute.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!form) notFound();

  const initial: AppFormInitial = {
    id: form.id,
    uniqueCode: form.uniqueCode,
    title: form.title ?? "",
    description: form.description ?? "",
    active: form.status === 1,
    fees: form.fees != null ? String(Number(form.fees)) : "",
    taxPercent: form.tax != null ? String(Number(form.tax)) : "",
    instituteIds: Array.isArray(form.allowedInstitutes)
      ? (form.allowedInstitutes as number[]).map(String)
      : [],
    countries: Array.isArray(form.allowedCountries)
      ? (form.allowedCountries as string[]).filter((c) => typeof c === "string")
      : [],
    requiredDocumentsText: Array.isArray(form.requiredDocuments)
      ? (form.requiredDocuments as string[])
          .filter((d) => typeof d === "string")
          .join("\n")
      : "",
  };

  return (
    <>
      <PageHeader title={`Edit — ${form.title ?? form.uniqueCode}`} description="Fee, eligibility and status." />
      <AppFormEditor
        initial={initial}
        institutes={institutes.map((i) => ({ id: i.id, name: i.name ?? `#${i.id}` }))}
        countries={countries.map((c) => c.name ?? "").filter(Boolean)}
      />
    </>
  );
}
