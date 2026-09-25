import { shippingLabel } from "@/features/checkout/lib/shipping";
import { formatPrice } from "@/lib/format";
import { PICKUP_HOLD_DAYS, pickupLocation } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";
import { BANK_TRANSFER_DETAILS } from "@/lib/shop-config";
import { EMAIL_FROM, resendClient } from "./client";

function layout(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <h1 style="font-size:20px;margin-bottom:16px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#767676">Well Botany</p>
  </div>`;
}

function pickupBlock(key: string | null): string {
  const location = pickupLocation(key);
  if (!location) return "";
  return `<h2 style="font-size:16px;margin-top:24px">Odbiór osobisty</h2>
    <p><strong>${location.name}</strong><br>${location.address}<br>${location.hours.join(", ")}</p>
    <p>Napiszemy, gdy zamówienie będzie gotowe do odbioru. Będzie na Ciebie czekać ${PICKUP_HOLD_DAYS} dni.</p>`;
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
      paymentMethod: true,
      paymentStatus: true,
      pickupLocation: true,
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
      <tr><td style="padding-top:12px;border-top:1px solid #e5e5e5">Dostawa (${shippingLabel(order.shippingMethod)})</td><td style="padding-top:12px;border-top:1px solid #e5e5e5;text-align:right">${formatPrice(order.shippingPln)}</td></tr>
      ${order.discountPln > 0 ? `<tr><td>Rabat</td><td style="text-align:right">-${formatPrice(order.discountPln)}</td></tr>` : ""}
      <tr><td style="padding-top:8px;font-weight:600">Łącznie</td><td style="padding-top:8px;text-align:right;font-weight:600">${formatPrice(order.totalPln)}</td></tr>
    </table>
    ${pickupBlock(order.pickupLocation)}
    ${
      order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus !== "CAPTURED"
        ? `<h2 style="font-size:16px;margin-top:24px">Dane do przelewu</h2>
    <p>Odbiorca: <strong>${BANK_TRANSFER_DETAILS.recipient}</strong><br>
    Numer rachunku: <strong>${BANK_TRANSFER_DETAILS.account}</strong><br>
    Kwota: <strong>${formatPrice(order.totalPln)}</strong><br>
    Tytuł przelewu: <strong>${order.orderNumber}</strong></p>
    <p>Zamówienie zrealizujemy po zaksięgowaniu wpłaty.</p>`
        : ""
    }
    ${
      order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus !== "CAPTURED"
        ? `<p>Do zapłaty przy odbiorze: <strong>${formatPrice(order.totalPln)}</strong></p>`
        : ""
    }
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
    <p>Przewoźnik: ${shippingLabel(order.shippingMethod)}</p>
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

export async function sendPickupReadyEmail(orderId: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      pickupLocation: true,
      paymentStatus: true,
      totalPln: true,
    },
  });
  const location = pickupLocation(order?.pickupLocation);
  if (!order || !location) return;

  const body = `
    <p>Cześć ${order.customerName}, Twoje zamówienie <strong>${order.orderNumber}</strong> czeka na odbiór.</p>
    <p><strong>${location.name}</strong><br>${location.address}<br>${location.hours.join(", ")}</p>
    ${order.paymentStatus !== "CAPTURED" ? `<p>Do zapłaty przy odbiorze: <strong>${formatPrice(order.totalPln)}</strong></p>` : ""}
    <p>Zamówienie będzie czekać ${PICKUP_HOLD_DAYS} dni. Podaj przy odbiorze numer zamówienia.</p>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: order.customerEmail,
    subject: `Zamówienie ${order.orderNumber} czeka na odbiór`,
    html: layout("Gotowe do odbioru", body),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** "Jak Ci się podobają produkty?" — link to /opinia/[token] (verified-buyer reviews). */
export async function sendReviewRequestEmail(orderId: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      reviewToken: true,
      items: { select: { productName: true }, take: 10 },
    },
  });
  if (!order?.reviewToken) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";
  const link = `${siteUrl}/opinia/${order.reviewToken}`;
  const products = [...new Set(order.items.map((i) => i.productName))]
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join("");
  const body = `
    <p>Cześć ${escapeHtml(order.customerName)}, dziękujemy za zakupy w Well Botany!</p>
    <p>Jak sprawdzają się produkty z zamówienia <strong>${escapeHtml(order.orderNumber)}</strong>? Twoja opinia pomoże innym klientom w wyborze.</p>
    <ul>${products}</ul>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#07674A;color:#fff;border-radius:999px;text-decoration:none">Wystaw opinię</a></p>
    <p style="font-size:12px;color:#767676">Opinie publikujemy po weryfikacji. Link jest ważny przez 120 dni.</p>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: order.customerEmail,
    subject: `Jak oceniasz zamówienie ${order.orderNumber}?`,
    html: layout("Podziel się opinią", body),
  });
}
