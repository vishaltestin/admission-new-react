"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitWebForm } from "@/lib/actions/webform-actions";

export type PublicAttribute = {
  id: number;
  name: string;
  placeholder: string | null;
  type: string;
  options: string | null;
  defaultValue: string | null;
  isRequired: boolean;
  isHidden: boolean;
};

export type PublicWebForm = {
  formId: string;
  title: string;
  description: string | null;
  submitButtonLabel: string;
  submitSuccessAction: string;
  submitSuccessContent: string | null;
  backgroundColor: string | null;
  formBackgroundColor: string | null;
  formTitleColor: string | null;
  formSubmitButtonColor: string | null;
  attributeLabelColor: string | null;
};

type Values = Record<string, string | boolean>;

/** Derive a zod schema from the server-defined attribute list. */
function buildSchema(attributes: PublicAttribute[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const attr of attributes) {
    const key = `f_${attr.id}`;
    const label = attr.name;
    if (attr.type === "checkbox") {
      shape[key] = attr.isRequired
        ? z.boolean().refine((v) => v, `${label} is required`)
        : z.boolean();
      continue;
    }
    let field: z.ZodTypeAny;
    switch (attr.type) {
      case "email":
        field = attr.isRequired
          ? z.string().min(1, `${label} is required`).email("Enter a valid email")
          : z.union([z.literal(""), z.string().email("Enter a valid email")]);
        break;
      case "number":
        field = attr.isRequired
          ? z.string().min(1, `${label} is required`).regex(/^\d+$/, "Numbers only")
          : z.union([z.literal(""), z.string().regex(/^\d+$/, "Numbers only")]);
        break;
      default:
        field = attr.isRequired
          ? z.string().min(1, `${label} is required`)
          : z.string();
    }
    shape[key] = field;
  }
  return z.object(shape);
}

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400";
const errCls = "mt-1 text-xs text-red-600";

export function WebformRenderer({
  form,
  attributes,
  headingsLevel = "h1",
}: {
  form: PublicWebForm;
  attributes: PublicAttribute[];
  headingsLevel?: "h1" | "h2";
}) {
  const schema = useMemo(() => buildSchema(attributes), [attributes]);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo(() => {
    const values: Values = {};
    for (const attr of attributes) {
      values[`f_${attr.id}`] =
        attr.type === "checkbox"
          ? attr.defaultValue === "1" || attr.defaultValue === "true"
          : (attr.defaultValue ?? "");
    }
    return values;
  }, [attributes]);

  // The schema is derived at runtime from attribute definitions, so the
  // resolver can't be statically typed — keep the form loosely typed.
  const rhf = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const submit = (values: Values) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitWebForm(form.formId, values);
      if (!result.ok) {
        setSubmitError(result.error ?? "Submission failed. Please try again.");
        return;
      }
      if (
        form.submitSuccessAction === "redirect" &&
        form.submitSuccessContent?.startsWith("http")
      ) {
        window.location.href = form.submitSuccessContent;
        return;
      }
      setDone(true);
    });
  };

  const Heading = headingsLevel;

  if (done) {
    return (
      <div
        className="w-full max-w-md rounded-xl p-8 text-center shadow-lg"
        style={{ backgroundColor: form.formBackgroundColor || "#ffffff" }}
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          ✓
        </div>
        <Heading
          className="text-xl font-semibold"
          style={{ color: form.formTitleColor || "#111827" }}
        >
          {form.submitSuccessContent || "Thank you! Your response has been recorded."}
        </Heading>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md rounded-xl p-6 shadow-lg sm:p-8"
      style={{ backgroundColor: form.formBackgroundColor || "#ffffff" }}
    >
      <Heading
        className="text-2xl font-semibold"
        style={{ color: form.formTitleColor || "#111827" }}
      >
        {form.title}
      </Heading>
      {form.description ? (
        <p className="mt-1 text-sm text-neutral-500">{form.description}</p>
      ) : null}

      <form onSubmit={rhf.handleSubmit(submit)} className="mt-6 space-y-4" noValidate>
        {attributes.map((attr) => {
          const key = `f_${attr.id}`;
          const error = rhf.formState.errors[key]?.message as string | undefined;
          const options = (attr.options ?? "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean);

          if (attr.isHidden) {
            return <input key={key} type="hidden" {...rhf.register(key)} />;
          }

          return (
            <div key={attr.id}>
              <label
                htmlFor={key}
                className="mb-1 block text-sm font-medium"
                style={{ color: form.attributeLabelColor || "#374151" }}
              >
                {attr.name}
                {attr.isRequired ? <span className="text-red-500"> *</span> : null}
              </label>

              {attr.type === "textarea" ? (
                <textarea
                  id={key}
                  rows={4}
                  placeholder={attr.placeholder ?? undefined}
                  className={inputCls}
                  {...rhf.register(key)}
                />
              ) : attr.type === "select" ? (
                <select id={key} className={inputCls} {...rhf.register(key)}>
                  <option value="">{attr.placeholder || "Select…"}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : attr.type === "radio" ? (
                <div className="space-y-1">
                  {options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input type="radio" value={option} {...rhf.register(key)} />
                      {option}
                    </label>
                  ))}
                  {!options.length ? <p className="text-xs text-neutral-400">No options configured</p> : null}
                </div>
              ) : attr.type === "checkbox" ? (
                <input
                  id={key}
                  type="checkbox"
                  className="size-4"
                  {...rhf.register(key)}
                />
              ) : (
                <input
                  id={key}
                  type={attr.type === "text" ? "text" : attr.type}
                  placeholder={attr.placeholder ?? undefined}
                  className={inputCls}
                  {...rhf.register(key)}
                />
              )}

              {error ? <p className={errCls}>{error}</p> : null}
            </div>
          );
        })}

        {submitError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: form.formSubmitButtonColor || "#111827" }}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {form.submitButtonLabel || "Submit"}
        </button>
      </form>
    </div>
  );
}
