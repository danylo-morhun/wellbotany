// Required env: BASELINKER_WEBHOOK_SECRET (token in ?token= query param)
// Optional env: BASELINKER_STATUS_PROCESSING, BASELINKER_STATUS_SHIPPED,
//               BASELINKER_STATUS_DELIVERED, BASELINKER_STATUS_CANCELLED
// Configure BL outgoing webhook to POST to: /api/baselinker/webhook?token=<secret>

import type { OrderStatus, ShippingMethod } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { blCall } from "@/lib/baselinker/client";
import { sendTrackingEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";

type BlOrderProduct = {
  product_id: string;
  name: string;
  sku: string;
  ean: string;
  quantity: number;
  price_brutto: number;
  tax_rate: number;
  weight: number;
};

type BlOrder = {
  order_id: number;
  status_id: number;
  allegro_form_id?: string;
  date_add: number;
  email: string;
  phone?: string;
  delivery_method?: string;
  delivery_price?: number;
  delivery_fullname?: string;
  delivery_company?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postcode?: string;
  delivery_country_code?: string;
  delivery_point_id?: string;
  delivery_point_name?: string;
  want_invoice?: number;
  invoice_company?: string;
  invoice_nip?: string;
  invoice_address?: string;
  invoice_city?: string;
  invoice_postcode?: string;
  invoice_country_code?: string;
  delivery_package_nr?: string;
  delivery_package_module?: string;
  products?: BlOrderProduct[];
};

function trackingUrl(module: string, nr: string): string {
  if (module.startsWith("inpost")) return `https://inpost.pl/sledzenie-paczek?number=${nr}`;
  if (module.startsWith("dhl"))
    return `https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${nr}`;
  if (module.startsWith("dpd")) return `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${nr}`;
  return "";
}

function mapStatusId(statusId: number): OrderStatus | null {
  const envId = (key: string): number | null => {
    const v = process.env[key];
    return v ? Number(v) : null;
  };
  if (statusId === envId("BASELINKER_STATUS_PROCESSING")) return "PROCESSING";
  if (statusId === envId("BASELINKER_STATUS_SHIPPED")) return "SHIPPED";
  if (statusId === envId("BASELINKER_STATUS_DELIVERED")) return "DELIVERED";
  if (statusId === envId("BASELINKER_STATUS_CANCELLED")) return "CANCELLED";
  return null;
}

function mapShippingMethod(deliveryMethod?: string): ShippingMethod {
  const m = (deliveryMethod ?? "").toLowerCase();
  if (m.includes("inpost") || m.includes("paczkomat")) return "INPOST_PACZKOMAT";
  if (m.includes("dhl")) return "DHL";
  if (m.includes("dpd")) return "DPD";
  return "COURIER";
}

async function ingestAllegroOrder(blOrder: BlOrder): Promise<void> {
  const blOrderId = String(blOrder.order_id);

  // Already ingested
  const existing = await prisma.order.findUnique({
    where: { baselinkerOrderId: blOrderId },
    select: { id: true },
  });
  if (existing) return;

  const products = blOrder.products ?? [];

  // Resolve local variants by EAN then SKU
  type ResolvedItem = {
    variantId: string | null;
    productName: string;
    variantOpt: string | null;
    sku: string;
    unitPricePln: number;
    vatRate: number;
    quantity: number;
    totalPln: number;
  };
  const items: ResolvedItem[] = await Promise.all(
    products.map(async (p) => {
      let variant = null;
      if (p.ean) {
        variant = await prisma.productVariant.findFirst({
          where: { ean: p.ean },
          select: { id: true, sku: true, optionValue: true, product: { select: { namePl: true } } },
        });
      }
      if (!variant && p.sku) {
        variant = await prisma.productVariant.findFirst({
          where: { sku: p.sku },
          select: { id: true, sku: true, optionValue: true, product: { select: { namePl: true } } },
        });
      }
      const unitPricePln = Math.round(p.price_brutto * 100);
      return {
        variantId: variant?.id ?? null,
        productName: variant?.product.namePl ?? p.name,
        variantOpt: variant?.optionValue ?? null,
        sku: variant?.sku ?? p.sku,
        unitPricePln,
        vatRate: p.tax_rate,
        quantity: p.quantity,
        totalPln: unitPricePln * p.quantity,
      };
    }),
  );

  const subtotalPln = items.reduce((s, i) => s + i.totalPln, 0);
  const shippingPln = Math.round((blOrder.delivery_price ?? 0) * 100);
  const taxPln = items.reduce((s, i) => {
    const rate = i.vatRate;
    return s + Math.round((i.totalPln * rate) / (100 + rate));
  }, 0);
  const totalPln = subtotalPln + shippingPln;

  const shippingMethod = mapShippingMethod(blOrder.delivery_method);
  const [firstName, ...rest] = (blOrder.delivery_fullname ?? "").split(" ");
  const lastName = rest.join(" ") || firstName;

  await prisma.$transaction(async (tx) => {
    const seq = await tx.orderSequence.upsert({
      where: { id: 1 },
      update: { value: { increment: 1 } },
      create: { id: 1, value: 1 },
      select: { value: true },
    });
    const year = new Date(blOrder.date_add * 1000).getFullYear();
    const orderNumber = `AL-${year}-${String(seq.value).padStart(5, "0")}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        status: "PAID",
        customerEmail: blOrder.email,
        customerPhone: blOrder.phone ?? null,
        customerName: blOrder.delivery_fullname ?? blOrder.email,
        shippingMethod,
        shippingCostPln: shippingPln,
        inpostMachineId:
          shippingMethod === "INPOST_PACZKOMAT" ? (blOrder.delivery_point_id ?? null) : null,
        inpostMachineName:
          shippingMethod === "INPOST_PACZKOMAT" ? (blOrder.delivery_point_name ?? null) : null,
        shipFirstName: firstName ?? "",
        shipLastName: lastName ?? "",
        shipCompany: blOrder.delivery_company ?? null,
        shipStreet: blOrder.delivery_address ?? "",
        shipCity: blOrder.delivery_city ?? "",
        shipPostalCode: blOrder.delivery_postcode ?? "",
        shipCountry: blOrder.delivery_country_code ?? "PL",
        wantsFaktura: (blOrder.want_invoice ?? 0) === 1,
        billCompany: blOrder.invoice_company ?? null,
        billNip: blOrder.invoice_nip ?? null,
        billStreet: blOrder.invoice_address ?? null,
        billCity: blOrder.invoice_city ?? null,
        billPostalCode: blOrder.invoice_postcode ?? null,
        billCountry: blOrder.invoice_country_code ?? null,
        paymentMethod: "ALLEGRO_PAY",
        paymentStatus: "CAPTURED",
        subtotalPln,
        discountPln: 0,
        shippingPln,
        taxPln,
        totalPln,
        baselinkerOrderId: blOrderId,
        allegroOrderId: blOrder.allegro_form_id ?? null,
        paidAt: new Date(blOrder.date_add * 1000),
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            productName: i.productName,
            variantOpt: i.variantOpt,
            sku: i.sku,
            quantity: i.quantity,
            unitPricePln: i.unitPricePln,
            vatRate: i.vatRate,
            totalPln: i.totalPln,
          })),
        },
      },
    });

    return order;
  });
}

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== (process.env.BASELINKER_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      body = Object.fromEntries(new URLSearchParams(await req.text()));
    } else {
      body = await req.json();
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const blOrderId = Number(body.bl_order_id ?? body.order_id);
  if (!blOrderId || Number.isNaN(blOrderId)) {
    return NextResponse.json({ error: "missing order_id" }, { status: 400 });
  }

  const result = await blCall<{ orders: BlOrder[] }>("getOrders", {
    filter_order_id: blOrderId,
  });

  const blOrder = result.orders[0];
  if (!blOrder) {
    return NextResponse.json({ error: "order not found in BL" }, { status: 404 });
  }

  // New Allegro order — ingest into local DB
  const localOrder = await prisma.order.findUnique({
    where: { baselinkerOrderId: String(blOrderId) },
    select: { id: true, shippedAt: true, trackingNumber: true },
  });

  if (!localOrder) {
    if (blOrder.allegro_form_id) {
      await ingestAllegroOrder(blOrder);
    }
    return NextResponse.json({ ok: true });
  }

  // Existing order — update status/tracking
  const newStatus = mapStatusId(blOrder.status_id);
  const tracking = blOrder.delivery_package_nr ?? null;
  const tUrl =
    tracking && blOrder.delivery_package_module
      ? trackingUrl(blOrder.delivery_package_module, tracking)
      : null;

  await prisma.order.update({
    where: { id: localOrder.id },
    data: {
      baselinkerStatus: String(blOrder.status_id),
      ...(newStatus && { status: newStatus }),
      ...(tracking && { trackingNumber: tracking }),
      ...(tUrl && { trackingUrl: tUrl }),
      ...(newStatus === "SHIPPED" && !localOrder.shippedAt && { shippedAt: new Date() }),
      ...(newStatus === "DELIVERED" && { deliveredAt: new Date() }),
    },
  });

  if (tracking && !localOrder.trackingNumber) {
    sendTrackingEmail(localOrder.id).catch((err) => {
      console.error(`[email] tracking notification failed for order ${localOrder.id}:`, err);
    });
  }

  return NextResponse.json({ ok: true });
}
