import { z } from "zod";

/** Client form schema for the send-message dialog (no .default() – RHF rule). */
export const sendMessageFormSchema = z.object({
  channel: z.enum(["email", "sms", "whatsapp"]),
  templateId: z.string().optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(1, "Message cannot be empty").max(20000),
});
export type SendMessageFormData = z.infer<typeof sendMessageFormSchema>;

/** Client form schema for SMTP email settings. */
export const emailSettingsFormSchema = z.object({
  mailHost: z.string().max(100).optional(),
  mailPort: z.string().max(20).optional(),
  mailUsername: z.string().max(100).optional(),
  mailPassword: z.string().max(255).optional(),
  mailEncryption: z.string().max(10).optional(),
  mailFromAddress: z.string().max(100).optional(),
  mailFromName: z.string().max(100).optional(),
  active: z.boolean(),
});
export type EmailSettingsFormData = z.infer<typeof emailSettingsFormSchema>;
