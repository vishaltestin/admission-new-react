import type { Metadata } from "next";

import { auth } from "@/auth";
import { TeamsTable, type TeamRow } from "@/components/teams/teams-client";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [teams, users] = await Promise.all([
    prisma.team.findMany({
      where: scope,
      orderBy: { name: "asc" },
      include: { members: { include: { user: true } } },
    }),
    prisma.user.findMany({
      where: { status: 1, ...scope },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const headIds = teams.map((t) => t.head).filter((h) => h > 0);
  const heads = await prisma.user.findMany({
    where: { id: { in: headIds } },
  });

  function nameOf(user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null) {
    if (!user) return null;
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  }

  // Leads assigned to any member of the team.
  const rows: TeamRow[] = [];
  for (const team of teams) {
    const memberIds = team.members.map((m) => m.userId);
    const leadCount =
      memberIds.length > 0
        ? await prisma.lead.count({
            where: { leadAssignTo: { in: memberIds }, ...scope },
          })
        : 0;
    rows.push({
      id: team.id,
      name: team.name ?? `Team #${team.id}`,
      head: team.head || null,
      headName: nameOf(heads.find((h) => h.id === team.head)),
      memberIds,
      memberNames: team.members
        .map((m) => nameOf(m.user))
        .filter((n): n is string => !!n),
      status: team.status === 1,
      leadCount,
    });
  }

  return (
    <>
      <PageHeader
        title="Teams"
        description="Organize counselors into teams for distribution and reporting."
      />
      <TeamsTable
        rows={rows}
        users={users.map((u) => ({ id: u.id, name: nameOf(u) ?? u.email }))}
      />
    </>
  );
}
