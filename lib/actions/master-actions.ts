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
import {
  instituteSchema,
  leadSourceSchema,
  leadStatusSchema,
  leadSubStatusSchema,
  leadTypeSchema,
  programSchema,
} from "@/lib/validations/masters";
import { prisma } from "@/lib/prisma";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const MASTERS_PATH = "/masters";

// ---------------------------------------------------------------------------
// Lead statuses
// ---------------------------------------------------------------------------

export async function createLeadStatus(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = leadStatusSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const status = await prisma.leadStatus.create({
      data: {
        organizationId,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath(MASTERS_PATH);
    revalidatePath("/leads");
    return ok("Status created", { id: status.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the status.");
  }
}

export async function updateLeadStatusMaster(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadStatusSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.leadStatus.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath(MASTERS_PATH);
    revalidatePath("/leads");
    return ok("Status updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the status.");
  }
}

export async function deleteLeadStatusMaster(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { leadStatusId: id } });
    if (usage > 0) {
      return fail(`This status is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.leadStatus.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath(MASTERS_PATH);
    revalidatePath("/leads");
    return ok("Status deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the status.");
  }
}

// ---------------------------------------------------------------------------
// Lead sub-statuses
// ---------------------------------------------------------------------------

export async function createLeadSubStatus(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = leadSubStatusSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const sub = await prisma.leadSubStatus.create({
      data: {
        organizationId,
        name: parsed.data.name,
        leadStatusId: parsed.data.leadStatusId,
        color: parsed.data.color ?? null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Sub-status created", { id: sub.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the sub-status.");
  }
}

export async function updateLeadSubStatusMaster(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadSubStatusSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.leadSubStatus.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        leadStatusId: parsed.data.leadStatusId,
        color: parsed.data.color ?? null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Sub-status updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the sub-status.");
  }
}

export async function deleteLeadSubStatusMaster(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { leadSubStatusId: id } });
    if (usage > 0) {
      return fail(`This sub-status is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.leadSubStatus.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath(MASTERS_PATH);
    return ok("Sub-status deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the sub-status.");
  }
}

// ---------------------------------------------------------------------------
// Lead sources
// ---------------------------------------------------------------------------

export async function createLeadSource(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = leadSourceSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const source = await prisma.leadSource.create({
      data: {
        organizationId,
        name: parsed.data.name,
        billingSetupAmount: parsed.data.billingSetupAmount,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Source created", { id: source.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the source.");
  }
}

export async function updateLeadSourceMaster(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadSourceSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.leadSource.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        billingSetupAmount: parsed.data.billingSetupAmount,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Source updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the source.");
  }
}

export async function deleteLeadSourceMaster(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { leadSourceId: id } });
    if (usage > 0) {
      return fail(`This source is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.leadSource.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath(MASTERS_PATH);
    return ok("Source deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the source.");
  }
}

// ---------------------------------------------------------------------------
// Lead types
// ---------------------------------------------------------------------------

export async function createLeadType(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = leadTypeSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const type = await prisma.leadType.create({
      data: {
        organizationId,
        name: parsed.data.name,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Type created", { id: type.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the type.");
  }
}

export async function updateLeadTypeMaster(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadTypeSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.leadType.updateMany({
      where: { id, ...orgScope(user) },
      data: { name: parsed.data.name, status: parsed.data.status ? 1 : 0 },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Type updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the type.");
  }
}

export async function deleteLeadTypeMaster(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { typeId: id } });
    if (usage > 0) {
      return fail(`This type is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.leadType.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath(MASTERS_PATH);
    return ok("Type deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the type.");
  }
}

// ---------------------------------------------------------------------------
// Institutes
// ---------------------------------------------------------------------------

export async function createInstitute(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = instituteSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const institute = await prisma.institute.create({
      data: {
        organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Institute created", { id: institute.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the institute.");
  }
}

export async function updateInstitute(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = instituteSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.institute.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Institute updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the institute.");
  }
}

export async function deleteInstitute(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { instituteId: id } });
    if (usage > 0) {
      return fail(`This institute is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.institute.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath(MASTERS_PATH);
    return ok("Institute deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the institute.");
  }
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export async function createProgram(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = programSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    const program = await prisma.program.create({
      data: {
        instituteId: parsed.data.instituteId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Program created", { id: program.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the program.");
  }
}

export async function updateProgram(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  await requireUser();
  const parsed = programSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.program.update({
      where: { id },
      data: {
        instituteId: parsed.data.instituteId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath(MASTERS_PATH);
    return ok("Program updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the program.");
  }
}

export async function deleteProgram(id: number): Promise<ActionResult> {
  await requireUser();
  try {
    const usage = await prisma.lead.count({ where: { programmeId: id } });
    if (usage > 0) {
      return fail(`This program is used by ${usage} lead(s) and cannot be deleted.`);
    }
    await prisma.program.delete({ where: { id } });
    revalidatePath(MASTERS_PATH);
    return ok("Program deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the program.");
  }
}
