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
import { templateSchema } from "@/lib/validations/templates";
import { prisma } from "@/lib/prisma";

export type TemplateChannel = "email" | "sms" | "whatsapp";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const modelFor = {
  email: () => prisma.emailTemplate,
  sms: () => prisma.messageTemplate,
  whatsapp: () => prisma.whatsappTemplate,
} as const;

function parseVariables(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  const items = raw
    .split(",")
    .map((item) => item.trim().replace(/^\{\{|\}\}$/g, ""))
    .filter(Boolean);
  return items.length ? items : null;
}

export async function createTemplate(
  channel: TemplateChannel,
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = templateSchema(channel).safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const model = modelFor[channel]();
    // The three template tables share an identical shape except `subject`
    // which only exists on email templates.
    const data = {
      organizationId,
      createdBy: user.id,
      title: parsed.data.title,
      category: parsed.data.category ?? null,
      sendBy: parsed.data.sendBy ?? null,
      message: parsed.data.message,
      variables: parseVariables(parsed.data.variables ?? null),
      status: parsed.data.status ? "active" : "inactive",
      ...(channel === "email" ? { subject: parsed.data.subject ?? null } : {}),
    };
    const created = await (model as any).create({ data });
    revalidatePath("/templates");
    return ok("Template created", { id: created.id as number });
  } catch (error) {
    console.error(error);
    return fail("Could not create the template.");
  }
}

export async function updateTemplate(
  channel: TemplateChannel,
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = templateSchema(channel).safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    const model = modelFor[channel]();
    await (model as any).updateMany({
      where: { id, ...orgScope(user) },
      data: {
        title: parsed.data.title,
        category: parsed.data.category ?? null,
        sendBy: parsed.data.sendBy ?? null,
        message: parsed.data.message,
        variables: parseVariables(parsed.data.variables ?? null),
        status: parsed.data.status ? "active" : "inactive",
        ...(channel === "email" ? { subject: parsed.data.subject ?? null } : {}),
      },
    });
    revalidatePath("/templates");
    return ok("Template updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the template.");
  }
}

export async function deleteTemplate(
  channel: TemplateChannel,
  id: number,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const model = modelFor[channel]();
    await (model as any).deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/templates");
    return ok("Template deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the template.");
  }
}
