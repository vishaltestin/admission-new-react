import { z } from "zod";

import { emptyToNull, requiredFk } from "./helpers";

export const leadStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  color: emptyToNull(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #22c55e")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type LeadStatusFormValues = z.input<typeof leadStatusSchema>;

export const leadSubStatusSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  leadStatusId: requiredFk("Please choose a status"),
  color: emptyToNull(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type LeadSubStatusFormValues = z.input<typeof leadSubStatusSchema>;

export const leadSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  billingSetupAmount: z.coerce.number().min(0).default(0),
  status: z.boolean().default(true),
});

export type LeadSourceFormValues = z.input<typeof leadSourceSchema>;

export const leadTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  status: z.boolean().default(true),
});

export type LeadTypeFormValues = z.input<typeof leadTypeSchema>;

export const instituteSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: emptyToNull(z.string().max(5000)),
  status: z.boolean().default(true),
});

export type InstituteFormValues = z.input<typeof instituteSchema>;

export const programSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  instituteId: requiredFk("Please choose an institute"),
  description: emptyToNull(z.string().max(5000)),
  status: z.boolean().default(true),
});

export type ProgramFormValues = z.input<typeof programSchema>;

// ---------------------------------------------------------------------------
// Client-side form schemas (react-hook-form) — HTML controls emit strings,
// the server schemas above coerce to numbers / nulls.
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^$|^#[0-9a-fA-F]{6}$/, "Use a hex color like #22c55e")
  .optional();

export const statusFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  color: hexColor,
  sortOrder: z.string().regex(/^\d*$/, "Numbers only").optional(),
  isActive: z.boolean(),
});
export type StatusFormData = z.infer<typeof statusFormSchema>;

export const subStatusFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  leadStatusId: z.string().min(1, "Please choose a status"),
  color: hexColor,
  sortOrder: z.string().regex(/^\d*$/, "Numbers only").optional(),
  isActive: z.boolean(),
});
export type SubStatusFormData = z.infer<typeof subStatusFormSchema>;

export const sourceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  billingSetupAmount: z
    .string()
    .regex(/^$|^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 150.00)")
    .optional(),
  status: z.boolean(),
});
export type SourceFormData = z.infer<typeof sourceFormSchema>;

export const typeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  status: z.boolean(),
});
export type TypeFormData = z.infer<typeof typeFormSchema>;

export const instituteFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional(),
  status: z.boolean(),
});
export type InstituteFormData = z.infer<typeof instituteFormSchema>;

export const programFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  instituteId: z.string().min(1, "Please choose an institute"),
  description: z.string().max(5000).optional(),
  status: z.boolean(),
});
export type ProgramFormData = z.infer<typeof programFormSchema>;
