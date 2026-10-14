import type { Metadata } from "next";

import { auth } from "@/auth";
import { UsersTable, type UserRow } from "@/components/users/users-client";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: scope,
      orderBy: [{ firstName: "asc" }, { email: "asc" }],
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findMany({
      where: organizationId != null ? { organizationId } : {},
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    location: user.location,
    status: user.status === 1,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    roleId: user.roles[0]?.role.id ?? null,
    roleName: user.roles[0]?.role.name ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in to the CRM."
      />
      <UsersTable
        rows={rows}
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        currentUserId={Number(session?.user?.id)}
      />
    </>
  );
}
