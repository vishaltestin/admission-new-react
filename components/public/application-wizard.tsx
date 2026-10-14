"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  quoteApplicationPayment,
  startApplication,
  submitApplication,
  verifyApplicationOtp,
  type PaymentQuote,
} from "@/lib/actions/application-actions";
import {
  applicationDetailsSchema,
  otpSchema,
  type ApplicationDetailsData,
  type OtpData,
} from "@/lib/validations/applications";

type Step = "details" | "otp" | "payment" | "done";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400";
const errCls = "mt-1 text-xs text-red-600";

export function ApplicationWizard({
  code,
  title,
  description,
  fee,
  taxPercent,
  total: totalAmount,
  countries,
  institutes,
}: {
  code: string;
  title: string;
  description: string | null;
  fee: number;
  taxPercent: number;
  total: number;
  countries: string[];
  institutes: { id: number; name: string }[];
}) {
  const [step, setStep] = useState<Step>("details");
  const [pending, startTransition] = useTransition();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [finalPayable, setFinalPayable] = useState<number | null>(null);

  const detailsForm = useForm<ApplicationDetailsData>({
    resolver: zodResolver(applicationDetailsSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      country: "",
      instituteId: "",
      city: "",
      state: "",
      notes: "",
    },
  });
  const otpForm = useForm<OtpData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  // Load the payment quote when reaching the payment step.
  useEffect(() => {
    if (step === "payment" && sessionId) {
      void quoteApplicationPayment(code, sessionId, undefined).then(setQuote);
    }
  }, [step, sessionId, code]);

  const hasFees = totalAmount > 0;

  const onDetails = (values: ApplicationDetailsData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await startApplication(code, values);
      if (!result.ok || !result.sessionId) {
        setServerError(result.error ?? "Something went wrong.");
        return;
      }
      setSessionId(result.sessionId);
      if (result.requiresOtp) setStep("otp");
      else if (hasFees) setStep("payment");
      else {
        const submission = await submitApplication(code, result.sessionId);
        if (!submission.ok) setServerError(submission.error ?? "Something went wrong.");
        else {
          setFinalPayable(0);
          setStep("done");
        }
      }
    });
  };

  const onOtp = (values: OtpData) => {
    setServerError(null);
    if (!sessionId) return;
    startTransition(async () => {
      const result = await verifyApplicationOtp(code, sessionId, values);
      if (!result.ok) {
        setServerError(result.error ?? "Verification failed.");
        return;
      }
      if (hasFees) setStep("payment");
      else {
        const submission = await submitApplication(code, sessionId);
        if (!submission.ok) setServerError(submission.error ?? "Something went wrong.");
        else {
          setFinalPayable(0);
          setStep("done");
        }
      }
    });
  };

  const applyCoupon = () => {
    setServerError(null);
    if (!sessionId) return;
    startTransition(async () => {
      const result = await quoteApplicationPayment(code, sessionId, coupon || undefined);
      if (!result.ok) {
        setServerError(result.error ?? "Invalid coupon.");
        return;
      }
      setQuote(result);
    });
  };

  const confirmAndSubmit = () => {
    setServerError(null);
    if (!sessionId) return;
    const appliedCoupon = quote?.discount && quote.discount > 0 ? coupon : undefined;
    startTransition(async () => {
      const result = await submitApplication(code, sessionId, appliedCoupon);
      if (!result.ok) {
        setServerError(result.error ?? "Something went wrong.");
        return;
      }
      setFinalPayable(result.payable ?? 0);
      setStep("done");
    });
  };

  const errors = detailsForm.formState.errors;
  const paidNote = finalPayable != null && finalPayable > 0;

  return (
    <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg sm:p-8">
      {/* step dots */}
      <div className="mb-6 flex items-center gap-2">
        {["details", ...(hasFees ? ["otp", "payment"] : [])].length > 1
          ? ["details", hasFees ? "payment" : null]
              .filter(Boolean)
              .map((label, index, arr) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div
                    className={`size-2.5 rounded-full ${
                      ["details", "otp", "payment", "done"].indexOf(step) >= index
                        ? "bg-emerald-600"
                        : "bg-neutral-200"
                    }`}
                  />
                  {index < arr.length - 1 ? <div className="h-px flex-1 bg-neutral-200" /> : null}
                </div>
              ))
          : null}
      </div>

      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      {description ? (
        <p className="mt-1 whitespace-pre-line text-sm text-neutral-500">{description}</p>
      ) : null}

      {step === "details" ? (
        <form onSubmit={detailsForm.handleSubmit(onDetails)} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Full name <span className="text-red-500">*</span>
            </label>
            <input className={inputCls} placeholder="Asha Verma" {...detailsForm.register("name")} />
            {errors.name ? <p className={errCls}>{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input className={inputCls} placeholder="+91 98100 12345" {...detailsForm.register("mobile")} />
            {errors.mobile ? <p className={errCls}>{errors.mobile.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
            <input type="email" className={inputCls} placeholder="you@example.com" {...detailsForm.register("email")} />
            {errors.email ? <p className={errCls}>{errors.email.message}</p> : null}
          </div>
          {countries.length ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Country</label>
              <select className={inputCls} {...detailsForm.register("country")}>
                <option value="">Select…</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {institutes.length ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Institute</label>
              <select className={inputCls} {...detailsForm.register("instituteId")}>
                <option value="">Select…</option>
                {institutes.map((institute) => (
                  <option key={institute.id} value={String(institute.id)}>
                    {institute.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">City</label>
            <input className={inputCls} {...detailsForm.register("city")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">State</label>
            <input className={inputCls} {...detailsForm.register("state")} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Anything we should know? (optional)
            </label>
            <textarea rows={3} className={inputCls} {...detailsForm.register("notes")} />
          </div>

          {serverError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{serverError}</p>
          ) : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {hasFees ? "Continue" : "Submit application"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={otpForm.handleSubmit(onOtp)} className="mt-6 space-y-4" noValidate>
          <p className="text-sm text-neutral-600">
            We emailed a 6-digit verification code to your address. Enter it below to
            continue — it expires in 10 minutes.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Verification code
            </label>
            <input
              maxLength={6}
              inputMode="numeric"
              className={`${inputCls} text-center text-lg tracking-[0.5em]`}
              placeholder="••••••"
              {...otpForm.register("code")}
            />
            {otpForm.formState.errors.code ? (
              <p className={errCls}>{otpForm.formState.errors.code.message}</p>
            ) : null}
          </div>
          {serverError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          ) : null}
          <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify & continue
          </button>
        </form>
      ) : null}

      {step === "payment" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-neutral-200">
            <div className="flex justify-between px-4 py-2 text-sm">
              <span className="text-neutral-500">Application fee</span>
              <span>₹ {(quote?.fees ?? fee).toLocaleString("en-IN")}</span>
            </div>
            {taxPercent ? (
              <div className="flex justify-between border-t border-neutral-100 px-4 py-2 text-sm">
                <span className="text-neutral-500">Tax ({taxPercent}%)</span>
                <span>
                  ₹ {(((quote?.fees ?? fee) * (quote?.taxPercent ?? taxPercent)) / 100).toLocaleString("en-IN")}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-neutral-200 px-4 py-2 text-sm font-medium">
              <span>Total</span>
              <span>₹ {(quote?.total ?? totalAmount).toLocaleString("en-IN")}</span>
            </div>
            {quote?.discount ? (
              <div className="flex justify-between border-t border-neutral-100 px-4 py-2 text-sm text-emerald-700">
                <span>Coupon discount</span>
                <span>− ₹ {quote.discount.toLocaleString("en-IN")}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-neutral-200 px-4 py-3 font-semibold">
              <span className="inline-flex items-center gap-1">
                <IndianRupee className="size-4" /> Payable
              </span>
              <span>₹ {(quote?.payable ?? totalAmount).toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              className={`${inputCls} flex-1 uppercase`}
              placeholder="Coupon code (optional)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={pending || !coupon.trim()}
              className="rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              Apply
            </button>
          </div>

          {serverError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          ) : null}

          <button
            type="button"
            onClick={confirmAndSubmit}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {quote && quote.payable > 0 ? `Submit (pay ₹ ${quote.payable.toLocaleString("en-IN")})` : "Submit application"}
          </button>
          <p className="text-center text-xs text-neutral-400">
            Payment is collected by the admissions team after submission.
          </p>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-8 py-4 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h2 className="mt-3 text-xl font-semibold text-neutral-900">Application submitted</h2>
          <p className="mt-2 text-sm text-neutral-500">
            {paidNote
              ? `Your application is recorded. Please pay ₹ ${finalPayable?.toLocaleString("en-IN")} — the admissions team will reach out with payment instructions and next steps.`
              : "Your application is recorded. The admissions team will reach out with next steps."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
