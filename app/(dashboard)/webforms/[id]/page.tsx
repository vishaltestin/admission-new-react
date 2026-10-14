import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  WebformBuilder,
  type WebFormInitial,
} from "@/components/webforms/webforms-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Webform builder" };

export default async function WebformBuilderPage({
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

  const [form, sources, campaigns, types] = await Promise.all([
    prisma.webForm.findFirst({
      where: { id: formId, ...scope },
      include: { attributes: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.leadSource.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.leadType.findMany({ where: scope, orderBy: { name: "asc" } }),
  ]);
  if (!form) notFound();

  const toOptions = (rows: { id: number; name: string | null }[]) =>
    rows.map((r) => ({ id: r.id, name: r.name ?? `#${r.id}` }));
  const noneOr = (value: number | null) => (value ? String(value) : "none");

  const initial: WebFormInitial = {
    id: form.id,
    formId: form.formId,
    title: form.title,
    description: form.description ?? "",
    submitButtonLabel: form.submitButtonLabel,
    submitSuccessAction: form.submitSuccessAction === "redirect" ? "redirect" : "message",
    submitSuccessContent: form.submitSuccessContent ?? "",
    createLead: form.createLead,
    leadSourceId: noneOr(form.leadSourceId),
    campaignId: noneOr(form.campaignId),
    typeId: noneOr(form.typeId),
    backgroundColor: form.backgroundColor ?? "",
    formBackgroundColor: form.formBackgroundColor ?? "",
    formTitleColor: form.formTitleColor ?? "",
    formSubmitButtonColor: form.formSubmitButtonColor ?? "",
    attributeLabelColor: form.attributeLabelColor ?? "",
    attributes: form.attributes.map((attr) => ({
      name: attr.name,
      placeholder: attr.placeholder ?? "",
      type: (attr.type as WebFormInitial["attributes"][number]["type"]) || "text",
      options: attr.options ?? "",
      defaultValue: attr.defaultValue ?? "",
      isRequired: attr.isRequired,
      isHidden: attr.isHidden,
    })),
  };

  return (
    <>
      <PageHeader
        title={`Builder — ${form.title}`}
        description="Configure fields, defaults and the look & feel."
      />
      <WebformBuilder
        initial={initial}
        sources={toOptions(sources)}
        campaigns={toOptions(campaigns)}
        types={toOptions(types)}
      />
    </>
  );
}
