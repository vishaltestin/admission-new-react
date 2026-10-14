import { z } from "zod";

import { emptyToNull, optionalDateTime, optionalFk } from "./helpers";

export const leadSchema = z.object({
  name: emptyToNull(z.string().max(150)),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid mobile number (7–20 digits)"),
  alternateMobile: emptyToNull(
    z.string().regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid mobile number"),
  ),
  email: emptyToNull(z.email("Enter a valid email address").max(150)),
  city: emptyToNull(z.string().max(100)),
  state: emptyToNull(z.string().max(100)),
  country: emptyToNull(z.string().max(100)),
  instituteId: optionalFk,
  programmeId: optionalFk,
  leadSourceId: optionalFk,
  typeId: optionalFk,
  leadStatusId: optionalFk,
  leadSubStatusId: optionalFk,
  campaignId: optionalFk,
  leadAssignTo: optionalFk,
  nextFollowupAt: optionalDateTime,
  note: emptyToNull(z.string().max(5000)), // optional first note on create
});

export type LeadFormValues = z.infer<typeof leadSchema>;

// ---------------------------------------------------------------------------
// Client-side form schema (react-hook-form)
//
// HTML <select>/<input> values are always strings, so the form-level schema
// uses the same rules but keeps string types. The server schema above then
// coerces "none"/"" -> null, digit strings -> numbers, datetime-local ->
// Date. Both layers validate; the client gives instant feedback, the server
// is the source of truth.
// ---------------------------------------------------------------------------

const fkSelect = z.string().optional();

export const leadFormSchema = z.object({
  name: z.string().max(150, "Maximum 150 characters").optional(),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid mobile number (7–20 digits)"),
  alternateMobile: z
    .string()
    .regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid mobile number")
    .or(z.literal(""))
    .optional(),
  email: z.union([z.email("Enter a valid email address"), z.literal("")]).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  instituteId: fkSelect,
  programmeId: fkSelect,
  leadSourceId: fkSelect,
  typeId: fkSelect,
  leadStatusId: fkSelect,
  leadSubStatusId: fkSelect,
  campaignId: fkSelect,
  leadAssignTo: fkSelect,
  nextFollowupAt: z.string().optional(),
  note: z.string().max(5000, "Note is too long").optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

// Small form-level schemas for the lead detail page widgets.

export const noteFormSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(5000),
});
export type NoteFormData = z.infer<typeof noteFormSchema>;

export const statusChangeFormSchema = z.object({
  leadStatusId: z.string().optional(),
  leadSubStatusId: z.string().optional(),
  nextFollowupAt: z.string().optional(),
  note: z.string().max(5000).optional(),
});
export type StatusChangeFormData = z.infer<typeof statusChangeFormSchema>;

export const assignFormSchema = z.object({
  leadAssignTo: z.string().optional(),
});
export type AssignFormData = z.infer<typeof assignFormSchema>;

export const communicationFormSchema = z.object({
  channel: z.enum(["call", "email", "sms", "whatsapp"]),
  purpose: z.string().max(100).optional(),
});
export type CommunicationFormData = z.infer<typeof communicationFormSchema>;

export const leadNoteSchema = z.object({
  leadId: z.number().int().positive(),
  note: z.string().min(1, "Note cannot be empty").max(5000),
});

export type LeadNoteValues = z.infer<typeof leadNoteSchema>;

export const leadStatusChangeSchema = z.object({
  leadId: z.number().int().positive(),
  leadStatusId: optionalFk,
  leadSubStatusId: optionalFk,
  nextFollowupAt: optionalDateTime,
  note: emptyToNull(z.string().max(5000)),
});

export type LeadStatusChangeValues = z.infer<typeof leadStatusChangeSchema>;

export const leadAssignSchema = z.object({
  leadId: z.number().int().positive(),
  leadAssignTo: optionalFk,
});

export type LeadAssignValues = z.infer<typeof leadAssignSchema>;

export const communicationLogSchema = z.object({
  leadId: z.number().int().positive(),
  channel: z.enum(["call", "email", "sms", "whatsapp"]),
  purpose: emptyToNull(z.string().max(100)),
});

export type CommunicationLogValues = z.infer<typeof communicationLogSchema>;
