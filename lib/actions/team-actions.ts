"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import { teamSchema } from "@/lib/validations/team";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

export async function createTeam(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = teamSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const team = await prisma.team.create({
      data: {
        organizationId,
        name: parsed.data.name,
        head: parsed.data.head,
        status: parsed.data.status ? 1 : 0,
        createdBy: user.id,
        members: {
          create: parsed.data.memberIds.map((memberId) => ({ userId: memberId })),
        },
      },
    });
    revalidatePath("/teams");
    return ok("Team created", { id: team.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the team.");
  }
}

export async function updateTeam(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = teamSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const existing = await prisma.team.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!existing) return fail("Team not found.");

  try {
    await prisma.team.update({
      where: { id },
      data: {
        name: parsed.data.name,
        head: parsed.data.head,
        status: parsed.data.status ? 1 : 0,
        members: {
          deleteMany: {},
          create: parsed.data.memberIds.map((memberId) => ({ userId: memberId })),
        },
      },
    });
    revalidatePath("/teams");
    return ok("Team updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the team.");
  }
}

export async function deleteTeam(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.team.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/teams");
    return ok("Team deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the team.");
  }
}
