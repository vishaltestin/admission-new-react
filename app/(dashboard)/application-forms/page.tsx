import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppFormsTable,
  type AppFormRow,
} from "@/components/application-forms/application-forms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Application forms" };

export default async function ApplicationFormsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const forms = await prisma.applicationForm.findMany({
    where: scope,
    include: { _count: { select: { responses: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const rows: AppFormRow[] = forms.map((form) => ({
    id: form.id,
    uniqueCode: form.uniqueCode,
    title: form.title ?? `Form #${form.id}`,
    active: form.status === 1,
    total: form.totalAmount != null ? Number(form.totalAmount) : 0,
    responseCount: form._count.responses,
  }));

  return (
    <>
      <PageHeader
        title="Application forms"
        description="Public admission applications with OTP verification, coupons and fee tracking."
      />
      <AppFormsTable rows={rows} />
    </>
  );
}
