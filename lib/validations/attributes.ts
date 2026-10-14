import { z } from "zod";

export const ATTRIBUTE_KINDS = [
  "text",
  "textarea",
  "number",
  "email",
  "date",
  "select",
  "radio",
  "checkbox",
] as const;

export const attributeFormSchema = z
  .object({
    name: z.string().min(1, "Label is required").max(255),
    code: z
      .string()
      .min(1, "Key is required")
      .max(100)
      .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, numbers, underscores; start with a letter"),
    type: z.enum(ATTRIBUTE_KINDS),
    options: z.string().max(500).optional(),
    isRequired: z.boolean(),
    isActive: z.boolean(),
    sortOrder: z
      .string()
      .optional()
      .refine((v) => !v || v.trim() === "" || /^\d+$/.test(v.trim()), "Whole numbers only"),
  })
  .refine(
    (data) => {
      if (["select", "radio", "checkbox"].includes(data.type)) {
        return !!data.options?.trim();
      }
      return true;
    },
    { message: "Options are required for select/radio/checkbox fields", path: ["options"] },
  );
export type AttributeFormData = z.infer<typeof attributeFormSchema>;

export function slugifyCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "_$1")
    .slice(0, 50);
}
