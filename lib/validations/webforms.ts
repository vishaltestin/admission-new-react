import { z } from "zod";

const optId = z.string().optional();
const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color like #0ea5e9")
  .or(z.literal(""))
  .optional();

/** Client form schema for the builder (no .default() – supplied via defaultValues). */
export const webformFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional(),
  submitButtonLabel: z.string().min(1).max(60),
  submitSuccessAction: z.enum(["message", "redirect"]),
  submitSuccessContent: z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) =>
        !v ||
        v.trim() === "" ||
        !v.startsWith("http") ||
        z.string().url().safeParse(v).success,
      "Enter a valid redirect URL",
    ),
  createLead: z.boolean(),
  leadSourceId: optId,
  campaignId: optId,
  typeId: optId,
  backgroundColor: hexColor,
  formBackgroundColor: hexColor,
  formTitleColor: hexColor,
  formSubmitButtonColor: hexColor,
  attributeLabelColor: hexColor,
});
export type WebformFormData = z.infer<typeof webformFormSchema>;

/* -------------------------------- attributes ----------------------------- */

export const ATTRIBUTE_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "date",
  "textarea",
  "select",
  "radio",
  "checkbox",
] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export const webformAttributeRowSchema = z.object({
  name: z.string().min(1, "Label is required").max(120),
  placeholder: z.string().max(120).optional(),
  type: z.enum(ATTRIBUTE_TYPES),
  options: z.string().max(500).optional(),
  defaultValue: z.string().max(255).optional(),
  isRequired: z.boolean(),
  isHidden: z.boolean(),
});

export const webformBuilderFormSchema = webformFormSchema.extend({
  attributes: z.array(webformAttributeRowSchema).max(30),
});
export type WebformBuilderFormData = z.infer<typeof webformBuilderFormSchema>;

/** Reserved attribute labels that map onto core lead columns. */
export const CORE_FIELDS: Record<string, string> = {
  name: "name",
  mobile: "mobile",
  phone: "mobile",
  email: "email",
  city: "city",
  state: "state",
  country: "country",
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
