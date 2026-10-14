import type { Metadata } from "next";

import { auth } from "@/auth";
import { RolesTable, type RoleRow } from "@/components/users/roles-client";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;

  const roles = await prisma.role.findMany({
    where: organizationId != null ? { organizationId } : {},
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  const rows: RoleRow[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    slug: role.slug,
    userCount: role._count.users,
  }));

  return (
    <>
      <PageHeader
        title="Roles"
        description="User roles for access control."
      />
      <RolesTable rows={rows} />
    </>
  );
}
