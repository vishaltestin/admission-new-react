"use server";

import { revalidatePath } from "next/cache";

import {
  fail,
  ok,
  orgScope,
  requireUser,
  type ActionResult,
  type SessionUser,
} from "@/lib/action-utils";
import { couponApplySchema, couponFormSchema } from "@/lib/validations/coupons";
import { prisma } from "@/lib/prisma";

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

const date = (v: string | undefined) => {
  if (!v?.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.valueOf()) ? null : d;
};

export async function createCoupon(values: unknown): Promise<ActionResult<{ id: number }>> {
  const user = await requireUser();
  const parsed = couponFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const code = parsed.data.code.trim().toUpperCase();
  const clash = await prisma.coupon.findFirst({
    where: { organizationId, code },
    select: { id: true },
  });
  if (clash) return fail("This code already exists.", { code: ["Pick a different code"] });

  try {
    const coupon = await prisma.coupon.create({
      data: {
        organizationId,
        code,
        name: parsed.data.name || null,
        type: parsed.data.type,
        value: Number(parsed.data.value),
        minAmount: money(parsed.data.minAmount),
        maxDiscount: money(parsed.data.maxDiscount),
        usageType: parsed.data.usageType,
        usageLimit: money(parsed.data.usageLimit) ?? null,
        startAt: date(parsed.data.startAt),
        endAt: date(parsed.data.endAt),
        status: parsed.data.status ? 1 : 0,
        createdBy: user.id,
      },
    });
    revalidatePath("/coupons");
    return ok("Coupon created", { id: coupon.id });
  } catch (error) {
    console.error(error);
    return fail("Could not create the coupon.");
  }
}

export async function updateCoupon(id: number, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = couponFormSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Please fix the errors below", parsed.error.flatten().fieldErrors);
  }
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const code = parsed.data.code.trim().toUpperCase();
  const clash = await prisma.coupon.findFirst({
    where: { organizationId, code, NOT: { id } },
    select: { id: true },
  });
  if (clash) return fail("This code already exists.", { code: ["Pick a different code"] });

  try {
    await prisma.coupon.updateMany({
      where: { id, ...orgScope(user) },
      data: {
        code,
        name: parsed.data.name || null,
        type: parsed.data.type,
        value: Number(parsed.data.value),
        minAmount: money(parsed.data.minAmount),
        maxDiscount: money(parsed.data.maxDiscount),
        usageType: parsed.data.usageType,
        usageLimit: money(parsed.data.usageLimit) ?? null,
        startAt: date(parsed.data.startAt),
        endAt: date(parsed.data.endAt),
        status: parsed.data.status ? 1 : 0,
      },
    });
    revalidatePath("/coupons");
    return ok("Coupon updated");
  } catch (error) {
    console.error(error);
    return fail("Could not update the coupon.");
  }
}

export async function deleteCoupon(id: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await prisma.coupon.deleteMany({ where: { id, ...orgScope(user) } });
    revalidatePath("/coupons");
    return ok("Coupon deleted");
  } catch (error) {
    console.error(error);
    return fail("Could not delete the coupon.");
  }
}

/* ---------------------------------------------------------------------------
 * Preview + redemption (used by application-form payments in a later phase)
 * ------------------------------------------------------------------------- */

export type CouponQuote = {
  ok: boolean;
  error?: string;
  code?: string;
  discount?: number;
  payable?: number;
};

async function quoteCoupon(
  organizationId: number,
  code: string,
  orderAmount: number,
): Promise<CouponQuote> {
  const coupon = await prisma.coupon.findFirst({
    where: { organizationId, code: code.trim().toUpperCase() },
  });
  if (!coupon) return { ok: false, error: "Invalid coupon code" };
  if (coupon.status !== 1) return { ok: false, error: "This coupon is inactive" };
  const now = new Date();
  if (coupon.startAt && coupon.startAt > now) {
    return { ok: false, error: "This coupon is not valid yet" };
  }
  if (coupon.endAt && coupon.endAt < now) {
    return { ok: false, error: "This coupon has expired" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has been fully redeemed" };
  }
  const minAmount = coupon.minAmount != null ? Number(coupon.minAmount) : null;
  if (minAmount != null && orderAmount < minAmount) {
    return { ok: false, error: `Minimum order for this coupon is ₹${minAmount}` };
  }

  let discount =
    coupon.type === "percent"
      ? (orderAmount * Number(coupon.value)) / 100
      : Number(coupon.value);
  const maxDiscount = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null;
  if (maxDiscount != null) discount = Math.min(discount, maxDiscount);
  discount = Math.min(Math.round(discount * 100) / 100, orderAmount);

  return {
    ok: true,
    code: coupon.code,
    discount,
    payable: Math.max(0, Math.round((orderAmount - discount) * 100) / 100),
  };
}

/** Server action: live quote for a code + order amount. */
export async function previewCoupon(values: unknown): Promise<CouponQuote> {
  const user = await requireUser();
  const parsed = couponApplySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const organizationId = await requireOrgId(user);
  if (!organizationId) return { ok: false, error: "No organization found" };
  return quoteCoupon(organizationId, parsed.data.code, parsed.data.orderAmount);
}

/**
 * Redeem a coupon: records a usage row and bumps used_count atomically.
 * Call from the flow that actually collects payment.
 */
export async function redeemCoupon(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = couponApplySchema.safeParse(values);
  if (!parsed.success) return fail("Invalid input");
  const organizationId = await requireOrgId(user);
  if (!organizationId) return fail("No organization found.");

  const quote = await quoteCoupon(organizationId, parsed.data.code, parsed.data.orderAmount);
  if (!quote.ok || quote.discount == null) return fail(quote.error ?? "Invalid coupon");

  try {
    const coupon = await prisma.coupon.findFirst({
      where: { organizationId, code: parsed.data.code.trim().toUpperCase() },
      select: { id: true },
    });
    if (!coupon) return fail("Invalid coupon code");
    await prisma.$transaction([
      prisma.couponUsage.create({
        data: {
          organizationId,
          couponId: coupon.id,
          leadId: parsed.data.leadId ?? null,
          usedByUserId: user.id,
          discountAmount: quote.discount,
          orderAmount: parsed.data.orderAmount,
        },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
    return ok(`Coupon applied — ₹${quote.discount} off`);
  } catch (error) {
    console.error(error);
    return fail("Could not redeem the coupon.");
  }
}
