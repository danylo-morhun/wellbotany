import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { EMAIL_FROM, resendClient } from "./client";

const SHIPPING_LABELS: Record<string, string> = {
  INPOST_PACZKOMAT: "InPost Paczkomat",
  DHL: "DHL Kurier",
  DPD: "DPD Kurier",
  COURIER: "Kurier",
};

function layout(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <h1 style="font-size:20px;margin-bottom:16px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#767676">Twoje Zdrowie</p>
  </div>`;
}

export async function sendOrderConfirmationEmail(orderNumber: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      shippingMethod: true,
      subtotalPln: true,
      shippingPln: true,
      discountPln: true,
      totalPln: true,
      items: {
        select: { productName: true, variantOpt: true, quantity: true, totalPln: true },
      },
    },
  });
  if (!order) return;

  const itemRows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0">${item.productName}${item.variantOpt ? ` (${item.variantOpt})` : ""} × ${item.quantity}</td><td style="padding:6px 0;text-align:right">${formatPrice(item.totalPln)}</td></tr>`,
    )
    .join("");

  const body = `
    <p>Dziękujemy za zamówienie, ${order.customerName}!</p>
    <p>Numer zamówienia: <strong>${order.orderNumber}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      ${itemRows}
      <tr><td style="padding-top:12px;border-top:1px solid #e5e5e5">Dostawa (${SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod})</td><td style="padding-top:12px;border-top:1px solid #e5e5e5;text-align:right">${formatPrice(order.shippingPln)}</td></tr>
      ${order.discountPln > 0 ? `<tr><td>Rabat</td><td style="text-align:right">-${formatPrice(order.discountPln)}</td></tr>` : ""}
      <tr><td style="padding-top:8px;font-weight:600">Łącznie</td><td style="padding-top:8px;text-align:right;font-weight:600">${formatPrice(order.totalPln)}</td></tr>
    </table>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: order.customerEmail,
    subject: `Potwierdzenie zamówienia ${order.orderNumber}`,
    html: layout("Zamówienie przyjęte", body),
  });
}

export async function sendTrackingEmail(orderId: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      shippingMethod: true,
      trackingNumber: true,
      trackingUrl: true,
    },
  });
  if (!order?.trackingNumber) return;

  const body = `
    <p>Cześć ${order.customerName}, Twoje zamówienie <strong>${order.orderNumber}</strong> zostało nadane.</p>
    <p>Przewoźnik: ${SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}</p>
    <p>Numer przesyłki: <strong>${order.trackingNumber}</strong></p>
    ${order.trackingUrl ? `<p><a href="${order.trackingUrl}">Śledź przesyłkę</a></p>` : ""}
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: order.customerEmail,
    subject: `Wysłaliśmy Twoje zamówienie ${order.orderNumber}`,
    html: layout("Zamówienie w drodze", body),
  });
}
