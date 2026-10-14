import { z } from "zod";

/** Client form schema for /settings (no .default() – RHF rule). */
export const generalSettingsFormSchema = z.object({
  appName: z.string().max(255).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
  dateFormat: z.string().max(50).optional(),
  logo: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || z.string().url().safeParse(v).success, "Enter a valid URL"),
  favicon: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || z.string().url().safeParse(v).success, "Enter a valid URL"),
  defaultGateway: z.string().max(50).optional(),
  paymentCredentialsJson: z
    .string()
    .max(4000)
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true;
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "Must be valid JSON"),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500).optional(),
});
export type GeneralSettingsFormData = z.infer<typeof generalSettingsFormSchema>;
