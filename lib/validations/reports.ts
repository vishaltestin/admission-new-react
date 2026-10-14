import { z } from "zod";

export const REPORT_TYPES = [
  "user_wise_activity",
  "user_lead_assignment",
  "channel_usage",
  "source_spend",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  user_wise_activity: "User-wise activity",
  user_lead_assignment: "Lead assignment",
  channel_usage: "Communication channels",
  source_spend: "Campaign spend by source",
};

export const reportFormSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  dateFrom: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
  dateTo: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
});
export type ReportFormData = z.infer<typeof reportFormSchema>;
