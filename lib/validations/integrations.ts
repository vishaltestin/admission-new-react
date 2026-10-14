import { z } from "zod";

export const PROVIDERS = ["facebook", "instagram", "google"] as const;
export type IntegrationProvider = (typeof PROVIDERS)[number];

/* Client form schema — providers tab */

export const providerFormSchema = z.object({
  isEnabled: z.boolean(),
  credentials: z
    .array(
      z.object({
        key: z.string().min(1, "Key is required").max(100),
        value: z.string().max(4000),
      }),
    )
    .max(20),
});
export type ProviderFormData = z.infer<typeof providerFormSchema>;

/* Outgoing webhooks */

export const webhookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  entityType: z.string().min(1, "Choose an entity").max(50),
  description: z.string().max(255).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]),
  endPoint: z.url("Enter a valid URL like https://example.com/hook"),
  headersJson: z
    .string()
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true;
      try {
        const parsed = JSON.parse(v);
        return typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, "Must be a JSON object, e.g. {\"x-key\": \"abc\"}"),
  queryParamsJson: z
    .string()
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true;
      try {
        const parsed = JSON.parse(v);
        return typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, "Must be a JSON object, e.g. {\"source\": \"crm\"}"),
});
export type WebhookFormData = z.infer<typeof webhookFormSchema>;

/* Inbound payload schema (lenient – many providers send their own shapes). */

export const ingestPayloadSchema = z
  .object({
    name: z.string().max(150).optional(),
    full_name: z.string().max(150).optional(),
    mobile: z.string().max(30).optional(),
    phone: z.string().max(30).optional(),
    phone_number: z.string().max(30).optional(),
    email: z.string().email().max(191).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
    source_name: z.string().max(100).optional(),
    notes: z.string().max(5000).optional(),
  })
  .passthrough();
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
