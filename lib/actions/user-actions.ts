"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
} from "@/lib/action-utils";
import {
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validations/user";
import { prisma } from "@/lib/prisma";
import { roleSchema } from "@/lib/validations/user";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUser(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = userCreateSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return fail("A user with this email already exists", {
      email: ["Email is already in use"],
    });
  }

  try {
    const created = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password: await bcrypt.hash(parsed.data.password, 10),
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
        location: parsed.data.location ?? null,
        status: parsed.data.status ? 1 : 0,
        organizationId: user.organizationId,
        roles: { create: { roleId: parsed.data.roleId } },
      },
    });
    revalidatePath("/users");
    return ok("User created", { id: created.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the user.");
  }
}

export async function updateUser(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = userUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  const target = await prisma.user.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!target) return fail("User not found.");

  const emailTaken = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id } },
  });
  if (emailTaken) {
    return fail("A user with this email already exists", {
      email: ["Email is already in use"],
    });
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName ?? null,
        location: parsed.data.location ?? null,
        status: parsed.data.status ? 1 : 0,
        ...(parsed.data.password
          ? { password: await bcrypt.hash(parsed.data.password, 10) }
          : {}),
        roles: {
          deleteMany: {},
          create: { roleId: parsed.data.roleId },
        },
      },
    });
    revalidatePath("/users");
    return ok("User updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the user.");
  }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  const user = await requireUser();
  if (Number(user.id) === id) {
    return fail("You cannot delete your own account.");
  }
  const target = await prisma.user.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!target) return fail("User not found.");

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/users");
    return ok("User deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the user. Reassign their leads first.");
  }
}

export async function toggleUserStatus(id: number): Promise<ActionResult> {
  const user = await requireUser();
  if (Number(user.id) === id) {
    return fail("You cannot deactivate your own account.");
  }
  const target = await prisma.user.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!target) return fail("User not found.");

  try {
    await prisma.user.update({
      where: { id },
      data: { status: target.status === 1 ? 0 : 1 },
    });
    revalidatePath("/users");
    return ok(target.status === 1 ? "User deactivated" : "User activated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the user status.");
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function createRole(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = roleSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.role.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return fail("A role with this slug already exists", {
      slug: ["Slug is already in use"],
    });
  }

  try {
    const role = await prisma.role.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        organizationId: user.organizationId,
      },
    });
    revalidatePath("/users");
    return ok("Role created", { id: role.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the role.");
  }
}

export async function updateRole(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  await requireUser();
  const parsed = roleSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const existing = await prisma.role.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (existing) {
    return fail("A role with this slug already exists", {
      slug: ["Slug is already in use"],
    });
  }

  try {
    await prisma.role.update({
      where: { id },
      data: { name: parsed.data.name, slug: parsed.data.slug },
    });
    revalidatePath("/users");
    return ok("Role updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the role.");
  }
}

export async function deleteRole(id: number): Promise<ActionResult> {
  await requireUser();
  try {
    const usage = await prisma.roleUser.count({ where: { roleId: id } });
    if (usage > 0) {
      return fail(`This role is assigned to ${usage} user(s) and cannot be deleted.`);
    }
    await prisma.role.delete({ where: { id } });
    revalidatePath("/users");
    return ok("Role deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the role.");
  }
}
