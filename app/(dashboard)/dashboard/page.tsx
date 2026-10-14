import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { auth } from "@/auth";
import {
  LeadsTrendChart,
  SourcesBarChart,
  StatusDonut,
  type SourceBar,
  type StatusSlice,
  type TrendPoint,
} from "@/components/dashboard/dashboard-charts";
import { StatusBadge } from "@/components/leads/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thirtyDaysAgo = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    newToday,
    newThisMonth,
    followupsDue,
    statusGroups,
    sourceGroups,
    recentLeads,
    upcomingFollowups,
    convertedStatus,
    trendLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: scope }),
    prisma.lead.count({
      where: { ...scope, createdAt: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.lead.count({ where: { ...scope, createdAt: { gte: startOfMonth } } }),
    prisma.lead.count({
      where: { ...scope, nextFollowupAt: { lte: endOfToday, not: null } },
    }),
    prisma.lead.groupBy({
      by: ["leadStatusId"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["leadSourceId"],
      where: { ...scope, leadSourceId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { leadSourceId: "desc" } },
      take: 5,
    }),
    prisma.lead.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { status: true, source: true },
    }),
    prisma.lead.findMany({
      where: { ...scope, nextFollowupAt: { lte: endOfToday, not: null } },
      orderBy: { nextFollowupAt: "asc" },
      take: 8,
      include: { assignee: true, status: true },
    }),
    prisma.leadStatus.findFirst({
      where: { ...scope, name: { contains: "convert" } },
    }),
    prisma.lead.findMany({
      where: { ...scope, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const converted = convertedStatus
    ? await prisma.lead.count({
        where: { ...scope, leadStatusId: convertedStatus.id },
      })
    : 0;

  const statusIds = statusGroups
    .map((g) => g.leadStatusId)
    .filter((id): id is number => id != null);
  const statusRows = await prisma.leadStatus.findMany({
    where: { id: { in: statusIds } },
    orderBy: { sortOrder: "asc" },
  });
  const statusCounts = statusGroups.map((group) => ({
    status: statusRows.find((s) => s.id === group.leadStatusId),
    count: group._count._all,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((s) => s.count));

  const sourceIds = sourceGroups
    .map((g) => g.leadSourceId)
    .filter((id): id is number => id != null);
  const sourceRows = await prisma.leadSource.findMany({
    where: { id: { in: sourceIds } },
  });

  // Chart payloads
  const dayCount = new Map<string, number>();
  for (const lead of trendLeads) {
    const key = lead.createdAt.toISOString().slice(0, 10);
    dayCount.set(key, (dayCount.get(key) ?? 0) + 1);
  }
  const trend: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      leads: dayCount.get(key) ?? 0,
    };
  });

  const statusSlices: StatusSlice[] = statusCounts.map(({ status, count }) => ({
    name: status?.name ?? "No status",
    count,
    color: status?.color ?? "#94a3b8",
  }));

  const sourceBars: SourceBar[] = sourceGroups.map((group) => ({
    name:
      sourceRows.find((s) => s.id === group.leadSourceId)?.name ?? "Unknown",
    count: group._count._all,
  }));

  const stats = [
    {
      title: "Total leads",
      value: totalLeads,
      hint: `${newThisMonth} this month`,
      icon: UsersRound,
    },
    {
      title: "New today",
      value: newToday,
      hint: "Since midnight",
      icon: TrendingUp,
    },
    {
      title: "Follow-ups due",
      value: followupsDue,
      hint: "Scheduled up to today",
      icon: CalendarClock,
    },
    {
      title: "Converted",
      value: converted,
      hint:
        totalLeads > 0 ? `${Math.round((converted / totalLeads) * 100)}% conversion` : "No leads yet",
      icon: CircleDollarSign,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening across your leads today."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
            <CardDescription>The latest leads added to the CRM.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No leads yet.{" "}
                      <Link className="underline" href="/leads/new">
                        Add your first lead
                      </Link>
                      .
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium hover:underline"
                        >
                          {lead.name || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.mobile}
                      </TableCell>
                      <TableCell>
                        {lead.source ? (
                          <Badge variant="outline">{lead.source.name}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          name={lead.status?.name}
                          color={lead.status?.color}
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <LeadsTrendChart data={trend} />
        <StatusDonut data={statusSlices} />
      </div>

      <SourcesBarChart data={sourceBars} />

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups due</CardTitle>
          <CardDescription>
            Leads with a follow-up scheduled today or earlier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="text-right">Follow-up at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingFollowups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Nothing due. You&apos;re all caught up. 🎉
                  </TableCell>
                </TableRow>
              ) : (
                upcomingFollowups.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.name || lead.mobile}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        name={lead.status?.name}
                        color={lead.status?.color}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.assignee
                        ? [lead.assignee.firstName, lead.assignee.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDateTime(lead.nextFollowupAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
