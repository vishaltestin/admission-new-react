import { z } from "zod";

const numOrEmpty = z.string().optional();

/* Client form schema — action params are selects, so strings. */

export const automationRuleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  triggerEvent: z.enum(["lead_created", "status_changed"]),
  leadSourceId: numOrEmpty,
  typeId: numOrEmpty,
  leadStatusId: numOrEmpty,
  actions: z
    .array(
      z.enum(["change_status", "assign_to", "send_template", "fire_webhook"]),
    )
    .min(1, "Add at least one action"),
  // Param columns indexed like the actions array (all optional strings).
  statusIds: z.array(z.string().optional()).optional(),
  userIds: z.array(z.string().optional()).optional(),
  channels: z.array(z.string().optional()).optional(),
  templateIds: z.array(z.string().optional()).optional(),
  webhookIds: z.array(z.string().optional()).optional(),
  isActive: z.boolean(),
});

export type AutomationRuleFormData = z.infer<typeof automationRuleFormSchema>;

/* Server schema — full validation done in the action layer. */

export const automationRuleServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  triggerEvent: z.enum(["lead_created", "status_changed"]),
});

export const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Lead created",
  status_changed: "Status changed",
};

export const ACTION_LABELS: Record<string, string> = {
  change_status: "Change status",
  assign_to: "Assign to user",
  send_template: "Send template",
  fire_webhook: "Fire webhook",
};
