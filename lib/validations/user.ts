import { z } from "zod";

import { emptyToNull, optionalFk, requiredFk } from "./helpers";

export const userCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: emptyToNull(z.string().max(100)),
  email: z.email("Enter a valid email address").max(191),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  roleId: requiredFk("Please choose a role"),
  location: emptyToNull(z.string().max(255)),
  status: z.boolean().default(true),
});

export type UserCreateFormValues = z.input<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema.extend({
  // Password stays unchanged when left empty on edit.
  password: emptyToNull(z.string().min(8, "Password must be at least 8 characters").max(128)),
});

export type UserUpdateFormValues = z.input<typeof userUpdateSchema>;

export const roleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9\-]+$/, "Lowercase letters, numbers and dashes only"),
});

export type RoleFormValues = z.input<typeof roleSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "At least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormValues = z.input<typeof changePasswordSchema>;

// Re-export so single-import usage stays tidy.
export { optionalFk };

// ---------------------------------------------------------------------------
// Client-side form schemas (react-hook-form) — string based.
// ---------------------------------------------------------------------------

export const userCreateFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().max(100).optional(),
  email: z.email("Enter a valid email address").max(191),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  roleId: z.string().min(1, "Please choose a role"),
  location: z.string().max(255).optional(),
  status: z.boolean(),
});
export type UserCreateFormData = z.infer<typeof userCreateFormSchema>;

export const userEditFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().max(100).optional(),
  email: z.email("Enter a valid email address").max(191),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .or(z.literal(""))
    .optional(),
  roleId: z.string().min(1, "Please choose a role"),
  location: z.string().max(255).optional(),
  status: z.boolean(),
});
export type UserEditFormData = z.infer<typeof userEditFormSchema>;

export const roleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9\-]+$/, "Lowercase letters, numbers and dashes only"),
});
export type RoleFormData = z.infer<typeof roleFormSchema>;
