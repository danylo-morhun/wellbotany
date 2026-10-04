import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { SHIPPING_METHOD_KEYS } from "@/features/checkout/lib/shipping";
import { ShippingRatesForm } from "@/features/shipping/components/ShippingRatesForm";
import { isEpakaConfigured } from "@/features/shipping/lib/epaka";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dostawa" };

export default async function AdminShippingPage() {
  const saved = new Map((await prisma.shippingRate.findMany()).map((r) => [r.method as string, r]));
  const rows = SHIPPING_METHOD_KEYS.map((method) => ({
    method,
    pricePln: saved.get(method)?.pricePln ?? null,
    enabled: saved.get(method)?.enabled ?? false,
  }));

  return (
    <div>
      <PageHeader
        title="Dostawa"
        description="Metody dostawy widoczne w koszyku i ich ceny. Wyłączona metoda znika z koszyka, stopki i strony „Dostawa”."
      />
      <ShippingRatesForm rows={rows} epakaReady={isEpakaConfigured()} />
    </div>
  );
}
