import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  WebformsTable,
  type WebFormRow,
} from "@/components/webforms/webforms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Webforms" };

export default async function WebformsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const forms = await prisma.webForm.findMany({
    where: scope,
    include: { _count: { select: { attributes: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const rows: WebFormRow[] = forms.map((form) => ({
    id: form.id,
    formId: form.formId,
    title: form.title,
    viewCount: form.viewCount,
    submitCount: form.submitCount,
    attributeCount: form._count.attributes,
    createLead: form.createLead,
  }));

  return (
    <>
      <PageHeader
        title="Webforms"
        description="Embeddable lead-capture forms for your website and ad campaigns."
      />
      <WebformsTable rows={rows} />
    </>
  );
}
