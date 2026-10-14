"use server";

import { requireUser, type SessionUser } from "@/lib/action-utils";
import {
  REPORT_LABELS,
  reportFormSchema,
  type ReportType,
} from "@/lib/validations/reports";
import { prisma } from "@/lib/prisma";

export type ReportColumn = { key: string; label: string };
export type ReportCell = string | number;
export type ReportRow = Record<string, ReportCell>;
export type ReportData = {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  error?: string;
};

function dateRange(data: { dateFrom?: string; dateTo?: string }) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (data.dateFrom) {
    const from = new Date(`${data.dateFrom}T00:00:00.000`);
    if (!Number.isNaN(from.valueOf())) createdAt.gte = from;
  }
  if (data.dateTo) {
    const to = new Date(`${data.dateTo}T23:59:59.999`);
    if (!Number.isNaN(to.valueOf())) createdAt.lte = to;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

const scopeOf = (user: SessionUser) =>
  user.organizationId != null ? { organizationId: user.organizationId } : {};

const displayName = (u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

async function orgUsers(user: SessionUser) {
  return prisma.user.findMany({
    where: scopeOf(user),
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });
}

/* ------------------------------ report builders ------------------------- */

async function userWiseActivity(user: SessionUser, range: object): Promise<ReportData> {
  const users = await orgUsers(user);
  const rows: ReportRow[] = [];
  for (const u of users) {
    const [emails, sms, whatsapp, leadsCreated, activities] = await Promise.all([
      prisma.emailLog.count({ where: { sentBy: u.id, ...range } }),
      prisma.smsLog.count({ where: { sentBy: u.id, ...range } }),
      prisma.whatsappLog.count({ where: { sentBy: u.id, ...range } }),
      prisma.lead.count({ where: { createdBy: u.id, ...range } }),
      prisma.leadActivityLog.count({ where: { userId: u.id, ...range } }),
    ]);
    rows.push({
      user: displayName(u),
      leadsCreated,
      emails,
      sms,
      whatsapp,
      activities,
      total: leadsCreated + emails + sms + whatsapp + activities,
    });
  }
  return {
    title: REPORT_LABELS.user_wise_activity,
    columns: [
      { key: "user", label: "User" },
      { key: "leadsCreated", label: "Leads created" },
      { key: "emails", label: "Emails" },
      { key: "sms", label: "SMS" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "activities", label: "Lead activities" },
      { key: "total", label: "Total" },
    ],
    rows,
  };
}

async function userLeadAssignment(user: SessionUser, range: object): Promise<ReportData> {
  const where = { ...scopeOf(user), ...range };
  const users = await orgUsers(user);
  const rows: ReportRow[] = [];
  let assignedTotal = 0;
  for (const u of users) {
    const assigned = await prisma.lead.count({ where: { ...where, leadAssignTo: u.id } });
    assignedTotal += assigned;
    if (assigned > 0) rows.push({ user: displayName(u), assigned });
  }
  const unassigned = await prisma.lead.count({ where: { ...where, leadAssignTo: null } });
  rows.push({ user: "Unassigned", assigned: unassigned });
  rows.sort((a, b) => Number(b.assigned) - Number(a.assigned));
  const total = assignedTotal + unassigned;
  return {
    title: REPORT_LABELS.user_lead_assignment,
    columns: [
      { key: "user", label: "Assignee" },
      { key: "assigned", label: "Leads" },
      { key: "share", label: "Share" },
    ],
    rows: rows.map((r) => ({
      ...r,
      share: total ? `${Math.round((Number(r.assigned) / total) * 100)}%` : "0%",
    })),
  };
}

async function channelUsage(user: SessionUser, range: object): Promise<ReportData> {
  const scope = scopeOf(user);
  const [emails, emailFailed, emailSent, sms, whatsapp, calls] = await Promise.all([
    prisma.emailLog.count({ where: { ...scope, ...range } }),
    prisma.emailLog.count({ where: { ...scope, status: "failed", ...range } }),
    prisma.emailLog.count({ where: { ...scope, status: "sent", ...range } }),
    prisma.smsLog.count({ where: { ...scope, ...range } }),
    prisma.whatsappLog.count({ where: { ...scope, ...range } }),
    prisma.leadCommunicationLog.count({
      where: { channel: "call", lead: scope, ...range },
    }),
  ]);
  return {
    title: REPORT_LABELS.channel_usage,
    columns: [
      { key: "channel", label: "Channel" },
      { key: "count", label: "Messages" },
      { key: "detail", label: "Detail" },
    ],
    rows: [
      { channel: "Email", count: emails, detail: `${emailSent} sent · ${emailFailed} failed` },
      { channel: "SMS", count: sms, detail: "queued for provider" },
      { channel: "WhatsApp", count: whatsapp, detail: "queued for provider" },
      { channel: "Calls logged", count: calls, detail: "from lead timelines" },
    ],
  };
}

async function sourceSpend(user: SessionUser, range: object): Promise<ReportData> {
  const scope = scopeOf(user);
  // Source-level: leads + one-time setup billing amount (lead_sources table).
  const sources = await prisma.leadSource.findMany({
    where: scope,
    orderBy: { name: "asc" },
  });
  const rows: ReportRow[] = [];
  for (const source of sources) {
    const leads = await prisma.lead.count({
      where: { ...scope, leadSourceId: source.id, ...range },
    });
    const setup = Number(source.billingSetupAmount ?? 0);
    rows.push({
      source: source.name,
      leads,
      setupCost: setup ? `₹ ${setup.toLocaleString("en-IN")}` : "—",
      costPerLead:
        setup && leads ? `₹ ${Math.round(setup / leads).toLocaleString("en-IN")}` : "—",
    });
  }
  // Campaign-level: lead counts, joined to their marketing event.
  const campaigns = await prisma.campaign.findMany({
    where: scope,
    include: { marketingEvent: true },
    orderBy: { name: "asc" },
  });
  for (const campaign of campaigns) {
    const leads = await prisma.lead.count({
      where: { ...scope, campaignId: campaign.id, ...range },
    });
    rows.push({
      source: `${campaign.name} (campaign)`,
      leads,
      setupCost: campaign.marketingEvent?.name ?? "—",
      costPerLead: "—",
    });
  }
  return {
    title: REPORT_LABELS.source_spend,
    columns: [
      { key: "source", label: "Source / campaign" },
      { key: "leads", label: "Leads" },
      { key: "setupCost", label: "Setup cost / event" },
      { key: "costPerLead", label: "Cost per lead" },
    ],
    rows,
  };
}

/* ------------------------------- actions -------------------------------- */

function failReport(message: string): ReportData {
  return { title: "Report", columns: [], rows: [], error: message };
}

async function build(user: SessionUser, type: ReportType, range: object) {
  switch (type) {
    case "user_wise_activity":
      return userWiseActivity(user, range);
    case "user_lead_assignment":
      return userLeadAssignment(user, range);
    case "channel_usage":
      return channelUsage(user, range);
    case "source_spend":
      return sourceSpend(user, range);
  }
}

/** Generates report data as a plain serializable object. */
export async function getReportData(values: unknown): Promise<ReportData> {
  try {
    const user = await requireUser();
    const parsed = reportFormSchema.safeParse(values);
    if (!parsed.success) return failReport("Invalid report filters.");
    return await build(user, parsed.data.reportType, dateRange(parsed.data));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message === "Unauthorized" ? "Unauthorized" : "Could not generate the report.";
    return failReport(message);
  }
}

/** Same report streamed back as CSV text. */
export async function getReportCsv(values: unknown): Promise<string> {
  const user = await requireUser();
  const parsed = reportFormSchema.safeParse(values);
  if (!parsed.success) return "";
  const data = await build(user, parsed.data.reportType, dateRange(parsed.data));

  const escapeCell = (value: ReportCell) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    data.columns.map((c) => escapeCell(c.label)).join(","),
    ...data.rows.map((row) =>
      data.columns.map((c) => escapeCell(row[c.key] ?? "")).join(","),
    ),
  ].join("\n");
}
