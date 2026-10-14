import { z } from "zod";

export const landingPageFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes (e.g. mba-open-house)"),
  campaignId: z.string().optional(),
  published: z.boolean(),
  heroHeading: z.string().max(255).optional(),
  heroSubheading: z.string().max(500).optional(),
  heroCtaLabel: z.string().max(60).optional(),
  heroCtaUrl: z
    .string()
    .max(500)
    .optional()
    .refine((v) => !v || v.startsWith("/") || z.string().url().safeParse(v).success, "Enter a valid URL or /path"),
  heroImageUrl: z
    .string()
    .max(500)
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, "Enter a valid image URL"),
  aboutText: z.string().max(5000).optional(),
  webformId: z.string().optional(),
  features: z
    .array(
      z.object({
        title: z.string().min(1, "Feature title is required").max(120),
        text: z.string().max(300).optional(),
      }),
    )
    .max(6),
});
export type LandingPageFormData = z.infer<typeof landingPageFormSchema>;
