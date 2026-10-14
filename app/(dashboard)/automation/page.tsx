import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  AutomationClient,
  type RuleRow,
  type RuleOptionLists,
} from "@/components/automation/automation-client";
import { PageHeader } from "@/components/layout/page-header";
import {
  ruleConditionsSchema,
  ruleActionSchema,
} from "@/lib/automation/engine";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const metadata: Metadata = { title: "Automation" };

const idName = (row: { id: number; name: string | null }) => ({
  id: row.id,
  name: row.name ?? `#${row.id}`,
});

export default async function AutomationPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [rules, statuses, sources, types, users, webhooks, emailTemplates, smsTemplates, whatsappTemplates] =
    await Promise.all([
      prisma.automationRule.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
      }),
      prisma.leadStatus.findMany({
        where: { ...scope, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.leadSource.findMany({ where: scope, orderBy: { name: "asc" } }),
      prisma.leadType.findMany({ where: scope, orderBy: { name: "asc" } }),
      prisma.user.findMany({
        where: scope,
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: "asc" },
      }),
      prisma.webhook.findMany({ where: scope, orderBy: { name: "asc" } }),
      prisma.emailTemplate.findMany({ where: scope, orderBy: { title: "asc" } }),
      prisma.messageTemplate.findMany({ where: scope, orderBy: { title: "asc" } }),
      prisma.whatsappTemplate.findMany({ where: scope, orderBy: { title: "asc" } }),
    ]);

  const rows: RuleRow[] = rules.map((rule) => {
    let conditions = { leadSourceId: "none", typeId: "none", leadStatusId: "none" };
    try {
      const parsed = ruleConditionsSchema.parse(rule.conditions ?? {});
      conditions = {
        leadSourceId: parsed.leadSourceId ? String(parsed.leadSourceId) : "none",
        typeId: parsed.typeId ? String(parsed.typeId) : "none",
        leadStatusId: parsed.leadStatusId ? String(parsed.leadStatusId) : "none",
      };
    } catch {
      /* keep defaults */
    }

    let actions: string[] = [];
    const statusIds: string[] = [];
    const userIds: string[] = [];
    const channels: string[] = [];
    const templateIds: string[] = [];
    const webhookIds: string[] = [];
    try {
      const parsed = z.array(ruleActionSchema).parse(rule.actions);
      actions = parsed.map((a) => a.type);
      for (const a of parsed) {
        statusIds.push(a.type === "change_status" ? String(a.statusId) : "");
        userIds.push(a.type === "assign_to" ? String(a.userId) : "");
        channels.push(a.type === "send_template" ? a.channel : "");
        templateIds.push(a.type === "send_template" ? String(a.templateId) : "");
        webhookIds.push(a.type === "fire_webhook" ? String(a.webhookId) : "");
      }
    } catch {
      /* keep defaults */
    }

    return {
      id: rule.id,
      name: rule.name ?? `Rule #${rule.id}`,
      triggerEvent: rule.triggerEvent ?? "lead_created",
      isActive: rule.isActive,
      conditions,
      actions,
      statusIds,
      userIds,
      channels,
      templateIds,
      webhookIds,
    };
  });

  const options: RuleOptionLists = {
    statuses: statuses.map(idName),
    sources: sources.map(idName),
    types: types.map(idName),
    users: users.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    })),
    webhooks: webhooks.map((w) => ({ id: w.id, name: w.name })),
    templates: {
      email: emailTemplates.map((t: any) => ({ id: t.id, name: t.title ?? `#${t.id}` })),
      sms: smsTemplates.map((t: any) => ({ id: t.id, name: t.title ?? `#${t.id}` })),
      whatsapp: whatsappTemplates.map((t: any) => ({ id: t.id, name: t.title ?? `#${t.id}` })),
    },
  };

  return (
    <>
      <PageHeader
        title="Automation rules"
        description="When leads are created or change status, run actions automatically."
      />
      <AutomationClient rules={rows} options={options} />
    </>
  );
}
