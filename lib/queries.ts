import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * All option lists needed by the lead form / lead filters.
 * Scoped to the organization when one is known; platform-level
 * users (organizationId === null) see everything.
 */
export const getLeadFormOptions = cache(async (organizationId: number | null) => {
  const scope = organizationId != null ? { organizationId } : {};

  const [statuses, sources, types, institutes, users, campaigns, customFields] =
    await Promise.all([
      prisma.leadStatus.findMany({
        where: { ...scope, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          subStatuses: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      }),
      prisma.leadSource.findMany({
        where: { ...scope, status: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.leadType.findMany({
        where: { ...scope, status: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.institute.findMany({
        where: { ...scope, status: 1 },
        orderBy: { name: "asc" },
        include: {
          programs: { where: { status: 1 }, orderBy: { name: "asc" } },
        },
      }),
      prisma.user.findMany({
        where: { status: 1, ...(organizationId != null ? { organizationId } : {}) },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.campaign.findMany({
        where: scope,
        orderBy: { name: "asc" },
      }),
      prisma.attribute.findMany({
        where: { ...scope, entityType: "lead", isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

  return { statuses, sources, types, institutes, users, campaigns, customFields };
});

export const getRoles = cache(async (organizationId: number | null) => {
  return prisma.role.findMany({
    where: organizationId != null ? { organizationId } : {},
    orderBy: { name: "asc" },
  });
});

export type LeadFormOptions = Awaited<ReturnType<typeof getLeadFormOptions>>;
