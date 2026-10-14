import { z } from "zod";

const moneyOrEmpty = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === "" || /^\d+(\.\d{1,2})?$/.test(v.trim()), "Enter an amount like 499 or 499.00");

const intOrEmpty = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === "" || /^\d+$/.test(v.trim()), "Whole numbers only");

const dateOrEmpty = z
  .string()
  .optional()
  .refine((v) => !v || v.trim() === "" || !Number.isNaN(Date.parse(v)), "Invalid date");

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .min(3, "At least 3 characters")
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes and underscores only"),
    name: z.string().max(100).optional(),
    type: z.enum(["flat", "percent"]),
    value: z
      .string()
      .min(1, "Value is required")
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), "Enter an amount like 499 or 10"),
    minAmount: moneyOrEmpty,
    maxDiscount: moneyOrEmpty,
    usageType: z.enum(["single", "multiple"]),
    usageLimit: intOrEmpty,
    startAt: dateOrEmpty,
    endAt: dateOrEmpty,
    status: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.type !== "percent") return true;
      const value = Number(data.value);
      return value > 0 && value <= 100;
    },
    { message: "Percent coupons must be between 1 and 100", path: ["value"] },
  )
  .refine(
    (data) => {
      if (!data.startAt || !data.endAt) return true;
      return new Date(data.startAt) <= new Date(data.endAt);
    },
    { message: "End date must be after the start date", path: ["endAt"] },
  );
export type CouponFormData = z.infer<typeof couponFormSchema>;

export const couponApplySchema = z.object({
  code: z.string().min(1).max(50),
  orderAmount: z.number().nonnegative(),
  leadId: z.number().int().positive().optional(),
});
