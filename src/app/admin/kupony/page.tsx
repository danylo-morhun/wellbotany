import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { type CouponRow, CouponsTable } from "@/features/coupons/components/CouponsTable";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Kupony" };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ nowy?: string }>;
}) {
  const { nowy } = await searchParams;
  const [coupons, stats, welcome] = await Promise.all([
    // Personal newsletter welcome codes would flood the list — summarised below instead
    prisma.coupon.findMany({
      where: { subscriber: null },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.groupBy({
      by: ["couponId"],
      where: { couponId: { not: null }, status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } },
      _sum: { totalPln: true, discountPln: true },
    }),
    prisma.coupon.groupBy({
      by: ["usageCount"],
      where: { subscriber: { isNot: null } },
      _count: true,
    }),
  ]);
  const welcomeIssued = welcome.reduce((sum, g) => sum + g._count, 0);
  const welcomeUsed = welcome.filter((g) => g.usageCount > 0).reduce((sum, g) => sum + g._count, 0);
  const statsById = new Map(stats.map((s) => [s.couponId, s._sum]));
  const now = new Date();

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrderPln: c.minOrderPln,
    maxUsages: c.maxUsages,
    validFrom: c.validFrom,
    validUntil: c.validUntil,
    isActive: c.isActive,
    usageCount: c.usageCount,
    state: !c.isActive
      ? "off"
      : c.validUntil && c.validUntil < now
        ? "expired"
        : c.maxUsages !== null && c.usageCount >= c.maxUsages
          ? "exhausted"
          : c.validFrom && c.validFrom > now
            ? "scheduled"
            : "active",
    revenuePln: statsById.get(c.id)?.totalPln ?? 0,
    discountGivenPln: statsById.get(c.id)?.discountPln ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Kupony"
        description="Kody rabatowe wpisywane przez klientów w koszyku. Użyte kody można tylko wyłączyć."
      />
      <CouponsTable coupons={rows} openNew={nowy === "1"} />
      <p className="mt-4 text-sm text-muted-foreground">
        Kody powitalne z newslettera (WITAJ-…, jednorazowe): wydane {welcomeIssued}, użyte{" "}
        {welcomeUsed}.
      </p>
    </div>
  );
}
