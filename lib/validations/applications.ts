import { z } from "zod";

const moneyOrEmpty = z
  .string()
  .optional()
  .refine(
    (v) => !v || v.trim() === "" || /^\d+(\.\d{1,2})?$/.test(v.trim()),
    "Enter an amount like 499 or 499.00",
  );

/** Admin editor schema (checkbox arrays are strings of ids/names client-side). */
export const applicationFormEditorSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  active: z.boolean(),
  fees: moneyOrEmpty,
  taxPercent: moneyOrEmpty,
  instituteIds: z.array(z.string()).max(50),
  countries: z.array(z.string()).max(60),
  /** One document label per line */
  requiredDocumentsText: z.string().max(1000).optional(),
});
export type ApplicationFormEditorData = z.infer<typeof applicationFormEditorSchema>;

/** Public wizard step 1. */
export const applicationDetailsSchema = z.object({
  name: z.string().min(1, "Full name is required").max(150),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid mobile number"),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  country: z.string().max(100).optional(),
  instituteId: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type ApplicationDetailsData = z.infer<typeof applicationDetailsSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Digits only"),
});
export type OtpData = z.infer<typeof otpSchema>;

export const applicationCouponSchema = z.object({
  couponCode: z.string().max(50).optional(),
});
export type ApplicationCouponData = z.infer<typeof applicationCouponSchema>;
