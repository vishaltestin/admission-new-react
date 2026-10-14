import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  ResponsesTable,
  type AppResponseRow,
} from "@/components/application-forms/application-forms-client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Applications" };

export default async function ApplicationResponsesPage({
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

  const form = await prisma.applicationForm.findFirst({
    where: { id: formId, ...scope },
    include: {
      responses: { orderBy: { createdAt: "desc" }, take: 500 },
    },
  });
  if (!form) notFound();

  const rows: AppResponseRow[] = form.responses.map((response) => {
    const payload =
      response.responseJson && typeof response.responseJson === "object"
        ? (response.responseJson as {
            details?: Record<string, unknown>;
            discount?: number;
          })
        : {};
    const details = payload.details ?? {};
    return {
      id: response.id,
      leadId: response.leadId,
      name: String(details.name ?? ""),
      mobile: String(details.mobile ?? ""),
      email: String(details.email ?? ""),
      fillPercentage: response.fillPercentage,
      otpVerified: response.otpVerified === 1,
      paymentAmount: response.paymentAmount,
      paymentStatus: response.paymentStatus,
      discount: payload.discount ?? null,
      status: response.status,
      createdAt: response.createdAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title={`Applications — ${form.title ?? form.uniqueCode}`}
        description={`${rows.length} response(s) · Public link /apply/${form.uniqueCode}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/application-forms/${form.id}/edit`}>Edit form</Link>
          </Button>
        }
      />
      <ResponsesTable rows={rows} formTitle={form.title ?? form.uniqueCode} />
    </>
  );
}
