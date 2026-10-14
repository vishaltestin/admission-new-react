import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WebformRenderer } from "@/components/public/webform-renderer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Enquiry form",
  robots: { index: false, follow: false },
};

export default async function PublicWebformPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { formId } = await params;
  const { embed } = await searchParams;

  const form = await prisma.webForm.findFirst({
    where: { formId },
    include: { attributes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!form) notFound();

  // Fire-and-forget view tracking.
  void prisma.webForm.update({
    where: { id: form.id },
    data: { viewCount: { increment: 1 } },
  });

  const attributes = form.attributes.map((a) => ({
    id: a.id,
    name: a.name,
    placeholder: a.placeholder,
    type: a.type,
    options: a.options,
    defaultValue: a.defaultValue,
    isRequired: a.isRequired,
    isHidden: a.isHidden,
  }));
  const publicForm = {
    formId: form.formId,
    title: form.title,
    description: form.description,
    submitButtonLabel: form.submitButtonLabel,
    submitSuccessAction: form.submitSuccessAction,
    submitSuccessContent: form.submitSuccessContent,
    backgroundColor: form.backgroundColor,
    formBackgroundColor: form.formBackgroundColor,
    formTitleColor: form.formTitleColor,
    formSubmitButtonColor: form.formSubmitButtonColor,
    attributeLabelColor: form.attributeLabelColor,
  };

  return (
    <main
      className={
        embed
          ? "flex items-start justify-center p-2"
          : "flex min-h-screen items-center justify-center p-4"
      }
      style={{ backgroundColor: embed ? "transparent" : form.backgroundColor || "#f1f5f9" }}
    >
      <WebformRenderer form={publicForm} attributes={attributes} />
    </main>
  );
}
