import { z } from "zod";

import { emptyToNull, optionalFk } from "./helpers";

/* Server schema (coerces values coming from the client) */

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: emptyToNull(z.string().max(255)),
  type: emptyToNull(z.string().max(50)),
  status: emptyToNull(z.string().max(50)),
  marketingEventId: optionalFk,
  channel: emptyToNull(z.string().max(50)),
  templateId: optionalFk,
  audienceStatusId: optionalFk,
  scheduledAt: emptyToNull(
    z.string().max(30).refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "Enter a valid date & time",
    ),
  ),
});
export type CampaignValues = z.input<typeof campaignSchema>;

export const marketingEventSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: emptyToNull(z.string().max(255)),
  date: emptyToNull(z.string().max(20)), // YYYY-MM-DD -> stored as date
});
export type MarketingEventValues = z.input<typeof marketingEventSchema>;

/* Client (react-hook-form) schemas */

export const campaignFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().max(255).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  marketingEventId: z.string().optional(),
  channel: z.string().optional(),
  templateId: z.string().optional(),
  audienceStatusId: z.string().optional(),
  scheduledAt: z.string().optional(),
});
export type CampaignFormData = z.infer<typeof campaignFormSchema>;

export const marketingEventFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(255).optional(),
  date: z.string().optional(),
});
export type MarketingEventFormData = z.infer<typeof marketingEventFormSchema>;
