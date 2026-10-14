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
  leadAssignSchema,
  leadNoteSchema,
  leadSchema,
  leadStatusChangeSchema,
  communicationLogSchema,
} from "@/lib/validations/lead";
import { prisma } from "@/lib/prisma";

async function resolveOrganizationId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const firstOrg = await prisma.organization.findFirst({
    orderBy: { id: "asc" },
  });
  return firstOrg?.id ?? null;
}

function clean<T extends Record<string, unknown>>(obj: T) {
  // Strip `undefined` so Prisma never receives it.
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export async function createLead(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = leadSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const { note, ...data } = parsed.data;

  const organizationId = await resolveOrganizationId(user);
  if (!organizationId) {
    return fail("No organization found. Create an organization first.");
  }

  try {
    const lead = await prisma.lead.create({
      data: clean({
        ...data,
        name: data.name ?? null,
        organizationId,
        createdBy: user.id,
        leadRegistrationDate: new Date(),
      }),
    });

    if (note) {
      await prisma.leadNote.create({
        data: { leadId: lead.id, note, createdBy: user.id },
      });
    }

    await prisma.leadActivityLog.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        action: "lead_created",
        details: { source: "manual" },
      },
    });

    revalidatePath("/leads");
    return ok("Lead created successfully", { id: lead.id });
  } catch (error) {
    console.error("createLead failed", error);
    return fail("Could not create the lead. Please try again.");
  }
}

export async function updateLead(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const { note: _note, ...data } = parsed.data;

  const lead = await prisma.lead.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.lead.update({
      where: { id: lead.id },
      data: clean(data),
    });
    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);
    return ok("Lead updated successfully");
  } catch (error) {
    console.error("updateLead failed", error);
    return fail("Could not update the lead. Please try again.");
  }
}

export async function deleteLead(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const lead = await prisma.lead.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.lead.delete({ where: { id: lead.id } });
    revalidatePath("/leads");
    return ok("Lead deleted");
  } catch (error) {
    console.error("deleteLead failed", error);
    return fail("Could not delete the lead.");
  }
}

export async function updateLeadStatus(
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadStatusChangeSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const { leadId, leadStatusId, leadSubStatusId, nextFollowupAt, note } =
    parsed.data;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.lead.update({
      where: { id: lead.id },
      data: clean({
        leadStatusId,
        leadSubStatusId,
        nextFollowupAt,
      }),
    });

    if (note) {
      await prisma.leadNote.create({
        data: { leadId: lead.id, note, createdBy: user.id },
      });
    }

    await prisma.leadActivityLog.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        action: "status_changed",
        details: {
          from: lead.leadStatusId,
          to: leadStatusId ?? null,
          subStatus: leadSubStatusId ?? null,
        },
      },
    });

    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/leads");
    return ok("Status updated");
  } catch (error) {
    console.error("updateLeadStatus failed", error);
    return fail("Could not update the status.");
  }
}

export async function assignLead(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadAssignSchema.safeParse(values);
  if (!parsed.success) return fail("Invalid input.");

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { leadAssignTo: parsed.data.leadAssignTo ?? null },
    });
    await prisma.leadActivityLog.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        action: "assigned",
        details: {
          from: lead.leadAssignTo,
          to: parsed.data.leadAssignTo ?? null,
        },
      },
    });
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/leads");
    return ok("Lead assignment updated");
  } catch (error) {
    console.error("assignLead failed", error);
    return fail("Could not update the assignment.");
  }
}

export async function addLeadNote(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = leadNoteSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.leadNote.create({
      data: {
        leadId: lead.id,
        note: parsed.data.note,
        createdBy: user.id,
      },
    });
    revalidatePath(`/leads/${lead.id}`);
    return ok("Note added");
  } catch (error) {
    console.error("addLeadNote failed", error);
    return fail("Could not add the note.");
  }
}

export async function deleteLeadNote(
  noteId: number,
  leadId: number,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const note = await prisma.leadNote.findFirst({
      where: { id: noteId, leadId },
    });
    if (!note) return fail("Note not found.");
    await prisma.leadNote.delete({ where: { id: noteId } });
    revalidatePath(`/leads/${leadId}`);
    return ok("Note deleted");
  } catch (error) {
    console.error("deleteLeadNote failed", error);
    return fail("Could not delete the note.");
  }
}

export async function logCommunication(
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = communicationLogSchema.safeParse(values);
  if (!parsed.success) return fail("Invalid input.");

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, ...orgScope(user) },
  });
  if (!lead) return fail("Lead not found.");

  try {
    await prisma.leadCommunicationLog.create({
      data: {
        leadId: lead.id,
        channel: parsed.data.channel,
        direction: "outbound",
        purpose: parsed.data.purpose ?? null,
      },
    });
    revalidatePath(`/leads/${lead.id}`);
    return ok("Communication logged");
  } catch (error) {
    console.error("logCommunication failed", error);
    return fail("Could not log the communication.");
  }
}
