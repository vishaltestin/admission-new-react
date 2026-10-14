"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import {
  ruleActionSchema,
  ruleConditionsSchema,
  type RuleAction,
} from "@/lib/automation/engine";
import { automationRuleFormSchema } from "@/lib/validations/automation";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

function num(value: string | undefined | null): number | null {
  if (!value || value === "none") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Converts the flat form payload (parallel string arrays) into the
 * [conditions, actions] JSON stored on the rule, validating every action.
 */
function buildRulePayload(values: unknown) {
  const parsed = automationRuleFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: fail<never>("Please fix the errors below", parsed.error.flatten().fieldErrors) } as const;
  }
  const data = parsed.data;

  const conditions = ruleConditionsSchema.parse({
    leadSourceId: num(data.leadSourceId),
    typeId: num(data.typeId),
    leadStatusId: num(data.leadStatusId),
  });

  const actions: RuleAction[] = [];
  for (const [index, type] of data.actions.entries()) {
    let action: RuleAction | null = null;
    const statusId = num(data.statusIds?.[index]);
    const userId = num(data.userIds?.[index]);
    const templateId = num(data.templateIds?.[index]);
    const webhookId = num(data.webhookIds?.[index]);
    const channel = data.channels?.[index] ?? "";

    switch (type) {
      case "change_status":
        if (statusId) action = { type, statusId };
        break;
      case "assign_to":
        if (userId) action = { type, userId };
        break;
      case "send_template":
        if (templateId && z.enum(["email", "sms", "whatsapp"]).safeParse(channel).success) {
          action = { type, channel: channel as "email" | "sms" | "whatsapp", templateId };
        }
        break;
      case "fire_webhook":
        if (webhookId) action = { type, webhookId };
        break;
    }

    if (!action) {
      return {
        error: fail<never>(`Action #${index + 1} ("${type}") is missing its settings.`, {
          actions: [`Configure action #${index + 1}`],
        }),
      } as const;
    }
    actions.push(ruleActionSchema.parse(action));
  }

  return {
    name: data.name,
    triggerEvent: data.triggerEvent,
    isActive: data.isActive,
    conditions,
    actions,
  } as const;
}

export async function createAutomationRule(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const built = buildRulePayload(values);
  if ("error" in built && built.error) return built.error;

  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const rule = await prisma.automationRule.create({
      data: {
        organizationId,
        name: built.name,
        triggerEvent: built.triggerEvent,
        conditions: built.conditions,
        actions: built.actions,
        isActive: built.isActive,
        createdBy: user.id,
      },
    });
    revalidatePath("/automation");
    return ok("Rule created", { id: rule.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the rule.");
  }
}

export async function updateAutomationRule(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const built = buildRulePayload(values);
  if ("error" in built && built.error) return built.error;

  try {
    await prisma.automationRule.updateMany({
      where: {
        id,
        ...(user.organizationId != null ? { organizationId: user.organizationId } : {}),
      },
      data: {
        name: built.name,
        triggerEvent: built.triggerEvent,
        conditions: built.conditions,
        actions: built.actions,
        isActive: built.isActive,
      },
    });
    revalidatePath("/automation");
    return ok("Rule updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the rule.");
  }
}

export async function toggleAutomationRule(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const rule = await prisma.automationRule.findFirst({
    where: {
      id,
      ...(user.organizationId != null ? { organizationId: user.organizationId } : {}),
    },
  });
  if (!rule) return fail("Rule not found.");
  try {
    await prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
    revalidatePath("/automation");
    return ok(rule.isActive ? "Rule disabled" : "Rule enabled");
  } catch (error) {
    console.error(error);
    return fail("Could not update the rule.");
  }
}

export async function deleteAutomationRule(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.automationRule.deleteMany({
      where: {
        id,
        ...(user.organizationId != null ? { organizationId: user.organizationId } : {}),
      },
    });
    revalidatePath("/automation");
    return ok("Rule deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the rule.");
  }
}
