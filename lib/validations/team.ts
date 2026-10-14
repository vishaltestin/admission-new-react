import { z } from "zod";

export const teamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  head: z.preprocess((value) => {
    if (value === "" || value === undefined || value === null || value === "none") {
      return 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }, z.number().int().min(0).default(0)),
  memberIds: z.array(z.number().int().positive()).default([]),
  status: z.boolean().default(true),
});
export type TeamValues = z.input<typeof teamSchema>;

/* Client form schema */

export const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  head: z.string().optional(),
  memberIds: z.array(z.number()),
  status: z.boolean(),
});
export type TeamFormData = z.infer<typeof teamFormSchema>;
