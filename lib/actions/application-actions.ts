"use server";

import { randomBytes, randomInt } from "crypto";
import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import { runAutomationRules } from "@/lib/automation/engine";
import { quoteCoupon, redeemCouponCore } from "@/lib/coupons";
import { sendOrgMail } from "@/lib/mail";
import {
  applicationDetailsSchema,
  applicationFormEditorSchema,
  otpSchema,
} from "@/lib/validations/applications";
import { slugify } from "@/lib/validations/webforms";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

async function requireOrgId(user: SessionUser) {
  if (user.organizationId != null) return user.organizationId;
  const first = await prisma.organization.findFirst({ orderBy: { id: "asc" } });
  return first?.id ?? null;
}

const money = (v: string | undefined) => {
  if (!v?.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Fee + tax computed once, shared by admin save and the public summary. */
function computeTotals(form: { fees: { toString(): string } | null; tax: { toString(): string } | null; totalAmount: { toString(): string } | null }) {
  const fees = form.fees != null ? Number(form.fees) : 0;
  const taxPercent = form.tax != null ? Number(form.tax) : 0;
  const total =
    form.totalAmount != null && Number(form.totalAmount) > 0
      ? Number(form.totalAmount)
      : Math.round(fees * (1 + taxPercent / 100) * 100) / 100;
  return { fees, taxPercent, total };
}

/* ------------------------------- admin CRUD ------------------------------ */

async function uniqueCode(title: string, exceptId?: number) {
  const base = slugify(title) || "application";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const clash = await prisma.applicationForm.findFirst({
      where: { uniqueCode: candidate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

function editorPayload(data: {
  title: string;
  description?: string;
  active: boolean;
  fees?: string;
  taxPercent?: string;
  instituteIds: string[];
  countries: string[];
  requiredDocumentsText?: string;
}) {
  const fees = money(data.fees);
  const taxPercent = money(data.taxPercent);
  const total =
    fees != null ? Math.round(fees * (1 + (taxPercent ?? 0) / 100) * 100) / 100 : null;
  return {
    title: data.title,
    description: data.description || null,
    status: data.active ? 1 : 0,
    fees: fees as number | null,
    tax: taxPercent as number | null,
    totalAmount: total as number | null,
    allowedCountries: (data.countries.length ? data.countries : []) as Prisma.InputJsonValue,
    allowedInstitutes: data.instituteIds
      .map(Number)
      .filter((n) => Number.isFinite(n)),
    requiredDocuments: (data.requiredDocumentsText ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10),
  };
}

export async function createApplicationForm(
  values: unknown,
): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = applicationFormEditorSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  try {
    const form = await prisma.applicationForm.create({
      data: {
        organizationId,
        uniqueCode: await uniqueCode(parsed.data.title),
        gateway: "manual",
        createdBy: user.id,
        ...editorPayload(parsed.data),
      },
    });
    revalidatePath("/application-forms");
    return ok("Application form created", { id: form.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the application form.");
  }
}

export async function updateApplicationForm(
  id: number,
  values: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = applicationFormEditorSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  try {
    await prisma.applicationForm.updateMany({
      where: { id, ...orgScope(user) },
      data: editorPayload(parsed.data),
    });
    revalidatePath("/application-forms");
    return ok("Application form saved");
  } catch (error) {
    console.error(error);
    return fail("Could not save the application form.");
  }
}

export async function deleteApplicationForm(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.applicationForm.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/application-forms");
    return ok("Application form deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the application form.");
  }
}

export async function toggleApplicationForm(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const form = await prisma.applicationForm.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!form) return fail("Form not found.");
  await prisma.applicationForm.update({
    where: { id },
    data: { status: form.status === 1 ? 0 : 1 },
  });
  revalidatePath("/application-forms");
  return ok(form.status === 1 ? "Form deactivated" : "Form activated");
}

/* -------------------------- admin: payment ops --------------------------- */

export async function markApplicationPaid(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const response = await prisma.applicationFormResponse.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!response) return fail("Response not found.");
  try {
    await prisma.$transaction([
      prisma.applicationFormResponse.update({
        where: { id },
        data: { paymentStatus: 1, paymentMethod: "manual", status: "paid" },
      }),
      ...(response.leadId
        ? [
            prisma.leadApplication.updateMany({
              where: { leadId: response.leadId, applicationForm: response.formId },
              data: { paymentStatus: "paid", paymentMethod: "manual" },
            }),
          ]
        : []),
    ]);
    revalidatePath(`/application-forms/${response.formId}`);
    return ok("Payment marked as received");
  } catch (error) {
    console.error(error);
    return fail("Could not update the payment.");
  }
}

/** Admin: verify or reject a document. */
export async function setDocumentStatus(
  id: number,
  status: "verified" | "rejected",
): Promise<ActionResult> {
  const user = await requireUser();
  const doc = await prisma.applicationDocument.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!doc) return fail("Document not found.");
  await prisma.applicationDocument.update({
    where: { id },
    data: {
      status,
      verifiedByUserId: status === "verified" ? user.id : null,
      verifiedAt: status === "verified" ? new Date() : null,
    },
  });
  revalidatePath(`/application-forms/${doc.responseId}`);
  revalidatePath("/application-forms");
  return ok(status === "verified" ? "Document verified" : "Document rejected");
}

/** Admin: delete a stored document. */
export async function deleteApplicationDocument(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const doc = await prisma.applicationDocument.findFirst({
    where: { id, ...orgScope(user) },
  });
  if (!doc) return fail("Document not found.");
  await prisma.applicationDocument.delete({ where: { id } });
  const { deleteStoredDocument } = await import("@/lib/documents");
  await deleteStoredDocument(doc.storedName);
  revalidatePath("/application-forms");
  return ok("Document deleted");
}

/* ----------------------------- public wizard ----------------------------- */

export type WizardStart = {
  ok: boolean;
  error?: string;
  sessionId?: string;
  /** Whether the email-OTP step is required next. */
  requiresOtp?: boolean;
  otpDelivery?: "sent" | "unavailable";
};

async function loadPublicForm(code: string) {
  return prisma.applicationForm.findFirst({
    where: { uniqueCode: code, status: 1 },
  });
}

/** Step 1: save details, issue session + OTP if needed. */
export async function startApplication(
  code: string,
  values: unknown,
): Promise<WizardStart> {
  try {
    const form = await loadPublicForm(code);
    if (!form) return { ok: false, error: "This application link is no longer active." };

    const parsed = applicationDetailsSchema.safeParse(values);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Please check the details.",
      };
    }

    const { total } = computeTotals(form);
    const sessionId = randomBytes(16).toString("hex");

    // OTP is required when an email was given AND SMTP can actually send.
    let wantsOtp = false;
    if (parsed.data.email) {
      const settings = await prisma.emailSetting.findUnique({
        where: { organizationId: form.organizationId },
        select: { mailHost: true, status: true },
      });
      wantsOtp = !!settings?.mailHost && settings.status === 1;
    }

    let otpFields: { otpCode: string; otpExpiresAt: Date } | object = {};
    let otpDelivery: WizardStart["otpDelivery"] = "unavailable";
    if (wantsOtp) {
      const otp = String(randomInt(100000, 1000000));
      otpFields = {
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      const mail = await sendOrgMail(form.organizationId, {
        to: parsed.data.email!,
        subject: `${form.title ?? "Application"} — your verification code`,
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      });
      otpDelivery = mail.ok ? "sent" : "unavailable";
    }

    await prisma.applicationFormResponse.create({
      data: {
        organizationId: form.organizationId,
        formId: form.id,
        sessionId,
        responseJson: { details: parsed.data } as Prisma.InputJsonValue,
        fillPercentage: 40,
        currentStep: 1,
        paymentAmount: Math.round(total),
        paymentNeedToTake: total > 0 ? 1 : 0,
        ...otpFields,
      },
    });

    return { ok: true, sessionId, requiresOtp: otpDelivery === "sent", otpDelivery };
  } catch (error) {
    console.error("startApplication failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Step 2: verify the email OTP. */
export async function verifyApplicationOtp(
  code: string,
  sessionId: string,
  values: unknown,
): Promise<WizardStart> {
  const form = await loadPublicForm(code);
  if (!form) return { ok: false, error: "This application link is no longer active." };
  const parsed = otpSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Enter the 6-digit code." };

  const response = await prisma.applicationFormResponse.findFirst({
    where: { formId: form.id, sessionId },
  });
  if (!response) return { ok: false, error: "Session expired — start again." };
  if (!response.otpCode || !response.otpExpiresAt) {
    return { ok: false, error: "No OTP was issued for this session." };
  }
  if (response.otpExpiresAt < new Date()) {
    return { ok: false, error: "The code expired — start again." };
  }
  if (response.otpCode !== parsed.data.code) {
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.applicationFormResponse.update({
    where: { id: response.id },
    data: { emailVerified: 1, otpVerified: 1, currentStep: 2, fillPercentage: 70 },
  });
  return { ok: true, sessionId };
}

export type PaymentQuote = {
  ok: boolean;
  error?: string;
  fees: number;
  taxPercent: number;
  total: number;
  discount: number;
  payable: number;
  couponCode?: string;
};

/** Step 3: quote the payable amount, optionally with a coupon code. */
export async function quoteApplicationPayment(
  code: string,
  sessionId: string,
  couponCode?: string,
): Promise<PaymentQuote> {
  const form = await loadPublicForm(code);
  if (!form) {
    return { ok: false, error: "Inactive link", fees: 0, taxPercent: 0, total: 0, discount: 0, payable: 0 };
  }
  const response = await prisma.applicationFormResponse.findFirst({
    where: { formId: form.id, sessionId },
  });
  if (!response) {
    return { ok: false, error: "Session expired", fees: 0, taxPercent: 0, total: 0, discount: 0, payable: 0 };
  }
  const base = computeTotals(form);
  let discount = 0;
  let payable = base.total;
  if (couponCode?.trim() && base.total > 0) {
    const quote = await quoteCoupon(form.organizationId, couponCode, base.total);
    if (!quote.ok) {
      return { ok: false, error: quote.error, ...base, discount: 0, payable: base.total };
    }
    discount = quote.discount ?? 0;
    payable = quote.payable ?? base.total;
  }
  return { ok: true, ...base, discount, payable, couponCode: couponCode?.trim() || undefined };
}

/** Final step: create/reuse the lead and finalize the application. */
export async function submitApplication(
  code: string,
  sessionId: string,
  couponCode?: string,
): Promise<{ ok: boolean; error?: string; payable?: number }> {
  try {
    const form = await loadPublicForm(code);
    if (!form) return { ok: false, error: "This application link is no longer active." };

    const response = await prisma.applicationFormResponse.findFirst({
      where: { formId: form.id, sessionId },
    });
    if (!response) return { ok: false, error: "Session expired — start again." };
    if (response.status === "submitted" || response.leadId) {
      return { ok: true }; // idempotent double-submit
    }

    const stored =
      response.responseJson && typeof response.responseJson === "object"
        ? (response.responseJson as { details?: Record<string, unknown> })
        : {};
    const parsed = applicationDetailsSchema.safeParse(stored.details ?? {});
    if (!parsed.success) return { ok: false, error: "Details are incomplete — start again." };
    const details = parsed.data;

    const {
      fees,
      taxPercent: _tax,
      total,
    } = computeTotals(form);
    void fees;
    void _tax;

    // Coupon is finally redeemed here (exactly once).
    let discount = 0;
    let payable = total;
    if (couponCode?.trim() && total > 0) {
      const quote = await redeemCouponCore({
        organizationId: form.organizationId,
        code: couponCode,
        orderAmount: total,
      });
      if (!quote.ok) return { ok: false, error: quote.error ?? "Invalid coupon" };
      discount = quote.discount ?? 0;
      payable = quote.payable ?? total;
    }

    // Lead: dedupe by mobile within the organization.
    let lead = await prisma.lead.findFirst({
      where: { organizationId: form.organizationId, mobile: details.mobile.replace(/\s/g, "") },
    });
    let created = false;
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: form.organizationId,
          name: details.name,
          mobile: details.mobile.replace(/\s/g, ""),
          email: details.email || null,
          city: details.city || null,
          state: details.state || null,
          country: details.country || null,
          instituteId: Number(details.instituteId) || null,
          applicationFormId: form.id,
        },
      });
      created = true;
    }

    await prisma.$transaction([
      prisma.leadApplication.create({
        data: {
          leadId: lead.id,
          applicationForm: form.id,
          paymentStatus: payable > 0 ? "pending" : "paid",
          paymentMethod: payable > 0 ? null : "free",
        },
      }),
      prisma.applicationFormResponse.update({
        where: { id: response.id },
        data: {
          leadId: lead.id,
          status: "submitted",
          fillPercentage: 100,
          currentStep: 3,
          paymentAmount: Math.round(payable),
          paymentStatus: payable > 0 ? 0 : 1,
          paymentMethod: payable > 0 ? null : "free",
          responseJson: {
            details,
            coupon: couponCode?.trim() || null,
            discount,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.leadActivityLog.create({
        data: {
          leadId: lead.id,
          action: created ? "application_submitted" : "application_resubmitted",
          details: { form: form.title, code: form.uniqueCode, payable, discount },
        },
      }),
    ]);

    if (created) {
      void runAutomationRules("lead_created", lead.id);
    }
    return { ok: true, payable };
  } catch (error) {
    console.error("submitApplication failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
