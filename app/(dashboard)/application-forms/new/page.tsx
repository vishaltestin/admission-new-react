import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { AppFormEditor } from "@/components/application-forms/application-forms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New application form" };

export default async function NewApplicationFormPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [institutes, countries] = await Promise.all([
    prisma.institute.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="New application form" description="Define the fee and who can apply." />
      <AppFormEditor
        initial={null}
        institutes={institutes.map((i) => ({ id: i.id, name: i.name }))}
        countries={countries.map((c) => c.name ?? "").filter(Boolean)}
      />
    </>
  );
}
