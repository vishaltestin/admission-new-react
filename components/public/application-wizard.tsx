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

type Step = "details" | "otp" | "payment" | "documents" | "done";

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
  requiredDocuments = [],
}: {
  code: string;
  title: string;
  description: string | null;
  fee: number;
  taxPercent: number;
  total: number;
  countries: string[];
  institutes: { id: number; name: string }[];
  requiredDocuments?: string[];
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
          setStep(requiredDocuments.length ? "documents" : "done");
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
          setStep(requiredDocuments.length ? "documents" : "done");
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
      setStep(requiredDocuments.length ? "documents" : "done");
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

      {step === "documents" ? (
        <DocumentsStep
          sessionId={sessionId!}
          requiredDocuments={requiredDocuments}
          pending={pending}
          finish={() => setStep("done")}
        />
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

type UploadedDoc = {
  id: number;
  documentType: string;
  originalName: string;
  sizeBytes: number;
};

/** Step shown after a successful submission when the form asks for documents. */
function DocumentsStep({
  sessionId,
  requiredDocuments,
  pending,
  finish,
}: {
  sessionId: string;
  requiredDocuments: string[];
  pending: boolean;
  finish: () => void;
}) {
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/applications/documents?sessionId=${sessionId}`)
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((data: { documents: UploadedDoc[] }) => setUploaded(data.documents))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const upload = async (documentType: string, file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("sessionId", sessionId);
      body.set("documentType", documentType);
      body.set("file", file);
      const res = await fetch("/api/public/applications/documents", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as UploadedDoc & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        return;
      }
      setUploaded((prev) => [...prev.filter((d) => d.documentType !== documentType), data]);
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (doc: UploadedDoc) => {
    setError(null);
    await fetch(
      `/api/public/applications/documents?sessionId=${sessionId}&id=${doc.id}`,
      { method: "DELETE" },
    ).catch(() => {});
    setUploaded((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const doneCount = requiredDocuments.filter((d) =>
    uploaded.some((u) => u.documentType === d),
  ).length;

  return (
    <div className="mt-6 space-y-4">
      <CheckCircle2 className="size-10 text-emerald-600" />
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Application submitted — upload your documents
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          JPG/PNG/WebP/PDF, under 5 MB each. You can also skip this and share
          them with the admissions team later.
        </p>
      </div>

      <div className="space-y-3">
        {requiredDocuments.map((docType) => {
          const uploadedDoc = uploaded.find((u) => u.documentType === docType);
          return (
            <div
              key={docType}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800">{docType}</p>
                {uploadedDoc ? (
                  <p className="truncate text-xs text-emerald-700">
                    ✓ {uploadedDoc.originalName} ({Math.round(uploadedDoc.sizeBytes / 1024)} KB)
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400">Not uploaded yet</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {uploadedDoc ? (
                  <button
                    type="button"
                    onClick={() => void removeDoc(uploadedDoc)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
                <label
                  className={`cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploadedDoc ? "Replace" : "Choose file"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      void upload(docType, file);
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={finish}
        disabled={pending || uploading}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {doneCount >= requiredDocuments.length
          ? "Finish"
          : `Skip for now (${doneCount}/${requiredDocuments.length} uploaded)`}
      </button>
    </div>
  );
}
