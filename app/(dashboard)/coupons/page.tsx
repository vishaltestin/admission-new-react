import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  CouponsTable,
  type CouponRow,
} from "@/components/coupons/coupons-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const coupons = await prisma.coupon.findMany({
    where: scope,
    orderBy: { updatedAt: "desc" },
  });

  const rows: CouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type,
    value: String(coupon.value).replace(/\.00$/, ""),
    minAmount: coupon.minAmount != null ? String(coupon.minAmount).replace(/\.00$/, "") : null,
    maxDiscount:
      coupon.maxDiscount != null ? String(coupon.maxDiscount).replace(/\.00$/, "") : null,
    usageType: coupon.usageType,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    startAt: coupon.startAt?.toISOString() ?? null,
    endAt: coupon.endAt?.toISOString() ?? null,
    active: coupon.status === 1,
  }));

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes for application fees and campaigns."
      />
      <CouponsTable rows={rows} />
    </>
  );
}
