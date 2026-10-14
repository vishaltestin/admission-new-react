import { z } from "zod";

import { emptyToNull } from "./helpers";

/* Server schema shared by email / sms / whatsapp templates. */

const body = z.string().min(1, "Message body is required").max(20000);

export function templateSchema(channel: "email" | "sms" | "whatsapp") {
  return z.object({
    title: z.string().min(1, "Title is required").max(255),
    category: emptyToNull(z.string().max(100)),
    sendBy: emptyToNull(z.string().max(50)),
    subject:
      channel === "email"
        ? z.string().min(1, "Subject is required").max(255)
        : emptyToNull(z.string().max(255)),
    message: body,
    variables: emptyToNull(z.string().max(2000)), // comma-separated variable names
    status: z.boolean().default(true),
  });
}

/* Client form schema (subject validated per-channel in the form). */

export const templateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  category: z.string().max(100).optional(),
  sendBy: z.string().max(50).optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(1, "Message body is required").max(20000),
  variables: z.string().max(2000).optional(),
  status: z.boolean(),
});
export type TemplateFormData = z.infer<typeof templateFormSchema>;

export const TEMPLATE_VARIABLES = [
  "lead_name",
  "lead_mobile",
  "lead_email",
  "status",
  "counselor_name",
  "institute",
  "program",
] as const;
