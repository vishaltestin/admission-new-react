/**
 * Automation engine — evaluates automation_rules against a lead after a
 * trigger fires (lead_created | status_changed) and executes the actions.
 *
 * Actions write to the database directly (no server-action calls) so
 * status-change actions never recursively re-trigger the engine.
 */
import { z } from "zod";

import { deliverMessage } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";

export type AutomationTrigger = "lead_created" | "status_changed";

export const ruleConditionsSchema = z.object({
  leadSourceId: z.number().int().positive().nullish(),
  typeId: z.number().int().positive().nullish(),
  /** For status_changed: only run when the lead lands on this status. */
  leadStatusId: z.number().int().positive().nullish(),
});

export const ruleActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("change_status"), statusId: z.number().int().positive() }),
  z.object({ type: z.literal("assign_to"), userId: z.number().int().positive() }),
  z.object({
    type: z.literal("send_template"),
    channel: z.enum(["email", "sms", "whatsapp"]),
    templateId: z.number().int().positive(),
  }),
  z.object({ type: z.literal("fire_webhook"), webhookId: z.number().int().positive() }),
]);

export type RuleConditions = z.infer<typeof ruleConditionsSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;

async function fireOutgoingWebhook(args: {
  webhookId: number;
  organizationId: number;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; message: string }> {
  const webhook = await prisma.webhook.findFirst({
    where: { id: args.webhookId, organizationId: args.organizationId },
  });
  if (!webhook) return { ok: false, message: "Webhook not found" };

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...((webhook.headers as Record<string, string> | null) ?? {}),
    };
    const url = new URL(webhook.endPoint);
    if (webhook.queryParams && typeof webhook.queryParams === "object") {
      for (const [key, value] of Object.entries(
        webhook.queryParams as Record<string, string>,
      )) {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetch(url, {
      method: webhook.method || "POST",
      headers,
      body: webhook.method === "GET" ? undefined : JSON.stringify(args.payload),
    });
    return {
      ok: response.ok,
      message: `HTTP ${response.status} ${response.statusText}`.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      message: (error instanceof Error ? error.message : "Request failed").slice(0, 500),
    };
  }
}

export async function runAutomationRules(
  trigger: AutomationTrigger,
  leadId: number,
): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId: lead.organizationId,
        triggerEvent: trigger,
        isActive: true,
      },
    });

    for (const rule of rules) {
      let conditions: RuleConditions;
      try {
        conditions = ruleConditionsSchema.parse(rule.conditions ?? {});
      } catch {
        conditions = {};
      }

      if (conditions.leadSourceId && lead.leadSourceId !== conditions.leadSourceId) {
        continue;
      }
      if (conditions.typeId && lead.typeId !== conditions.typeId) {
        continue;
      }
      if (
        trigger === "status_changed" &&
        conditions.leadStatusId &&
        lead.leadStatusId !== conditions.leadStatusId
      ) {
        continue;
      }

      let actions: RuleAction[] = [];
      try {
        actions = z.array(ruleActionSchema).parse(rule.actions);
      } catch {
        continue; // corrupt action config – skip this rule
      }

      for (const [actionIndex, action] of actions.entries()) {
        let status = "success";
        let message = "";

        try {
          switch (action.type) {
            case "change_status": {
              await prisma.lead.update({
                where: { id: lead.id },
                data: { leadStatusId: action.statusId, leadSubStatusId: null },
              });
              message = `Status set to #${action.statusId}`;
              break;
            }
            case "assign_to": {
              await prisma.lead.update({
                where: { id: lead.id },
                data: { leadAssignTo: action.userId },
              });
              message = `Assigned to user #${action.userId}`;
              break;
            }
            case "send_template": {
              const result = await deliverMessage({
                organizationId: lead.organizationId,
                leadId: lead.id,
                channel: action.channel,
                templateId: action.templateId,
                sentBy: rule.createdBy ?? null,
              });
              status = result.status === "failed" ? "error" : "success";
              message = `${action.channel}: ${result.status} – ${result.message}`;
              break;
            }
            case "fire_webhook": {
              const result = await fireOutgoingWebhook({
                webhookId: action.webhookId,
                organizationId: lead.organizationId,
                payload: {
                  event: trigger,
                  lead: {
                    id: lead.id,
                    name: lead.name,
                    mobile: lead.mobile,
                    email: lead.email,
                    leadStatusId: lead.leadStatusId,
                    leadSourceId: lead.leadSourceId,
                  },
                },
              });
              status = result.ok ? "success" : "error";
              message = result.message;
              break;
            }
            default: {
              status = "skipped";
              message = "Unknown action type";
            }
          }
        } catch (error) {
          status = "error";
          message = error instanceof Error ? error.message : "Action failed";
        }

        await prisma.automationRuleLog.create({
          data: {
            orgId: lead.organizationId,
            ruleId: rule.id,
            leadId: lead.id,
            triggerEvent: trigger,
            actionType: `${actionIndex + 1}:${action.type}`,
            status,
            message: message.slice(0, 2000),
          },
        });
      }
    }
  } catch (error) {
    // The engine must never break the caller's flow.
    console.error("runAutomationRules failed", error);
  }
}
