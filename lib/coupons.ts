/**
 * Coupon quote + redemption core. No session assumptions — used by both the
 * authenticated coupon actions and the public application-form flow.
 */
import { prisma } from "@/lib/prisma";

export type CouponQuote = {
  ok: boolean;
  error?: string;
  code?: string;
  discount?: number;
  payable?: number;
};

export async function quoteCoupon(
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

/** Book a coupon inside a transaction-safe sequence (usage row + counter). */
export async function redeemCouponCore(args: {
  organizationId: number;
  code: string;
  orderAmount: number;
  leadId?: number | null;
  applicationId?: number | null;
  usedByUserId?: number | null;
}): Promise<CouponQuote> {
  const quote = await quoteCoupon(args.organizationId, args.code, args.orderAmount);
  if (!quote.ok || quote.discount == null) return quote;

  const coupon = await prisma.coupon.findFirst({
    where: { organizationId: args.organizationId, code: args.code.trim().toUpperCase() },
    select: { id: true },
  });
  if (!coupon) return { ok: false, error: "Invalid coupon code" };

  await prisma.$transaction([
    prisma.couponUsage.create({
      data: {
        organizationId: args.organizationId,
        couponId: coupon.id,
        leadId: args.leadId ?? null,
        applicationId: args.applicationId ?? null,
        usedByUserId: args.usedByUserId ?? null,
        discountAmount: quote.discount,
        orderAmount: args.orderAmount,
      },
    }),
    prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
  return quote;
}
