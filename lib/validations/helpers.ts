import { z } from "zod";

/**
 * Select / optional text inputs submit "" when empty – treat it as null
 * so optional columns stay NULL in the database instead of "".
 */
export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    schema.nullable().optional(),
  );

/** Optional foreign-key coming from a <select> ("" / "none" => null). */
export const optionalFk = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null || value === "none") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}, z.number().int().positive().nullable().optional());

/** Required foreign-key coming from a <select>. */
export const requiredFk = (message = "This field is required") =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : Number(value)),
    z
      .number({ error: message })
      .int()
      .positive(message),
  );

/** datetime-local input value -> Date, "" -> null. */
export const optionalDateTime = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}, z.date().nullable().optional());
