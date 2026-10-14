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
import { attributeFormSchema } from "@/lib/validations/attributes";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

export async function createAttribute(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = attributeFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const clash = await prisma.attribute.findFirst({
    where: { organizationId, entityType: "lead", code: parsed.data.code },
    select: { id: true },
  });
  if (clash) return fail("This key is already used.", { code: ["Pick a different key"] });

  try {
    const attribute = await prisma.attribute.create({
      data: {
        organizationId,
        code: parsed.data.code,
        name: parsed.data.name,
        type: parsed.data.type,
        options: parsed.data.options || null,
        entityType: "lead",
        sortOrder: Number(parsed.data.sortOrder) || 0,
        isRequired: parsed.data.isRequired,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath("/masters");
    return ok("Custom field created", { id: attribute.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the custom field.");
  }
}

export async function updateAttribute(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = attributeFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const clash = await prisma.attribute.findFirst({
    where: { organizationId, entityType: "lead", code: parsed.data.code, NOT: { id } },
    select: { id: true },
  });
  if (clash) return fail("This key is already used.", { code: ["Pick a different key"] });

  try {
    // Code is the storage key inside extra_fields_json — renaming it would
    // orphan historical values, so updates leave it untouched.
    await prisma.attribute.updateMany({
      where: { id, entityType: "lead", ...orgScope(user) },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        options: parsed.data.options || null,
        sortOrder: Number(parsed.data.sortOrder) || 0,
        isRequired: parsed.data.isRequired,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath("/masters");
    return ok("Custom field updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the custom field.");
  }
}

export async function deleteAttribute(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.attribute.deleteMany({
      where: { id, entityType: "lead", ...orgScope(user) },
    });
    revalidatePath("/masters");
    return ok("Custom field deleted — stored values on leads are kept");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the custom field.");
  }
}
