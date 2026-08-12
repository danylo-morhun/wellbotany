// Required env: BASELINKER_TOKEN, BASELINKER_NEW_ORDER_STATUS_ID (optional, default 0)
import { prisma } from "@/lib/prisma";
import { blCall } from "./client";

function deliveryMethodName(method: string): string {
  const map: Record<string, string> = {
    INPOST_PACZKOMAT: "InPost Paczkomat",
    INPOST_KURIER: "InPost Kurier",
    ORLEN_PACZKA: "Orlen Paczka",
    DHL: "DHL",
    DPD: "DPD",
    COURIER: "Kurier",
    PICKUP: "Odbiór osobisty",
  };
  return map[method] ?? method;
}

export async function pushOrderToBaselinker(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: {
            select: { ean: true, weightGrams: true, baselinkerVariantId: true },
          },
        },
      },
    },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.baselinkerOrderId) return order.baselinkerOrderId;

  const address = [order.shipStreet, order.shipApartment].filter(Boolean).join(" / ");

  const result = await blCall<{ order_id: number }>("addOrder", {
    order_status_id: Number(process.env.BASELINKER_NEW_ORDER_STATUS_ID ?? 0),
    date_add: Math.floor(order.createdAt.getTime() / 1000),
    user_login: order.customerEmail,
    phone: order.customerPhone ?? "",
    email: order.customerEmail,
    user_comments: order.noteCustomer ?? "",
    admin_comments: order.noteAdmin ?? "",
    currency: "PLN",
    payment_method: order.paymentMethod,
    payment_method_cod: 0,
    paid: order.paymentStatus === "CAPTURED" ? 1 : 0,
    delivery_method: deliveryMethodName(order.shippingMethod),
    delivery_price: order.shippingPln / 100,
    delivery_fullname: `${order.shipFirstName} ${order.shipLastName}`,
    delivery_company: order.shipCompany ?? "",
    delivery_address: address,
    delivery_city: order.shipCity,
    delivery_state: "",
    delivery_postcode: order.shipPostalCode,
    delivery_country_code: order.shipCountry,
    delivery_point_id: order.inpostMachineId ?? "",
    delivery_point_name: order.inpostMachineName ?? "",
    delivery_point_address: "",
    invoice_fullname: order.wantsFaktura ? `${order.shipFirstName} ${order.shipLastName}` : "",
    invoice_company: order.billCompany ?? "",
    invoice_nip: order.billNip ?? "",
    invoice_address: order.billStreet ?? "",
    invoice_city: order.billCity ?? "",
    invoice_state: "",
    invoice_postcode: order.billPostalCode ?? "",
    invoice_country_code: order.billCountry ?? "",
    want_invoice: order.wantsFaktura ? 1 : 0,
    extra_field_1: order.orderNumber,
    products: order.items.map((item) => ({
      storage: "db",
      storage_id: 0,
      product_id: item.variant?.baselinkerVariantId ?? item.sku,
      variant_id: "",
      name: item.variantOpt ? `${item.productName} – ${item.variantOpt}` : item.productName,
      sku: item.sku,
      ean: item.variant?.ean ?? "",
      location: "",
      warehouse_id: 0,
      attributes: "",
      price_brutto: item.unitPricePln / 100,
      tax_rate: Number(item.vatRate),
      quantity: item.quantity,
      weight: item.variant?.weightGrams ? item.variant.weightGrams / 1000 : 0,
    })),
  });

  const blOrderId = String(result.order_id);

  await prisma.order.update({
    where: { id: orderId },
    data: { baselinkerOrderId: blOrderId },
  });

  return blOrderId;
}
