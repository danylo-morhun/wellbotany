import { orderAccessToken } from "@/features/checkout/lib/order-access";
import { extraDueDay, plDate } from "@/features/orders/lib/payment-reminders";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { BANK_TRANSFER_DETAILS } from "@/lib/shop-config";
import { EMAIL_FROM, resendClient, sendEmail } from "./client";
import { escapeHtml, layout } from "./layout";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";
const SHOP_INBOX = process.env.SHOP_NOTIFY_EMAIL || "kontakt@wellbotany.pl";

type ReminderOrder = {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  totalPln: number;
  paymentMethod: string;
};

/** Customer reminder with the extra deadline. Returns false when e-mail is off (no key). */
export async function sendPaymentReminderEmail(
  order: ReminderOrder,
  sentAt: Date,
): Promise<boolean> {
  const resend = resendClient();
  if (!resend) return false;
  const due = plDate(extraDueDay(sentAt));
  const payLink = `${SITE}/zamowienie/potwierdzenie/${order.orderNumber}?dostep=${orderAccessToken(order.orderNumber)}`;

  const howToPay =
    order.paymentMethod === "BANK_TRANSFER"
      ? `<h2 style="font-size:16px;margin-top:24px">Dane do przelewu</h2>
    <p>Odbiorca: <strong>${BANK_TRANSFER_DETAILS.recipient}</strong><br>
    Numer rachunku: <strong>${BANK_TRANSFER_DETAILS.account}</strong><br>
    Kwota: <strong>${formatPrice(order.totalPln)}</strong><br>
    Tytuł przelewu: <strong>${order.orderNumber}</strong></p>`
      : `<p><a href="${payLink}" style="display:inline-block;background:#1f7a5c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Zapłać teraz</a></p>`;

  const body = `
    <p>Cześć ${escapeHtml(order.customerName)},</p>
    <p>nie otrzymaliśmy jeszcze płatności za zamówienie <strong>${order.orderNumber}</strong>
    (${formatPrice(order.totalPln)}). Termin 3 dni roboczych na zapłatę już minął.</p>
    <p>Wyznaczamy dodatkowy termin: <strong>do ${due}</strong>. Jeśli do tego dnia nie otrzymamy
    płatności, możemy odstąpić od umowy (regulamin §5) — poinformujemy Cię o tym e-mailem.
    Zamówienie wyślemy po zaksięgowaniu wpłaty.</p>
    ${howToPay}
    <p>Jeśli płatność została już wykonana, zignoruj tę wiadomość. Nie chcesz już tego zamówienia?
    Odpowiedz na tę wiadomość — anulujemy je.</p>
  `;
  await sendEmail(resend, {
    from: EMAIL_FROM,
    to: order.customerEmail,
    replyTo: SHOP_INBOX,
    subject: `Przypomnienie o płatności — zamówienie ${order.orderNumber}`,
    html: layout("Przypomnienie o płatności", body),
  });
  return true;
}

/** Shop inbox: reminders sent today and orders whose extra time just ran out. */
export async function sendPaymentReminderSummary(
  reminded: { orderNumber: string; totalPln: number; due: string }[],
  expired: { orderNumber: string; totalPln: number }[],
): Promise<void> {
  const resend = resendClient();
  if (!resend || (reminded.length === 0 && expired.length === 0)) return;
  const li = (o: { orderNumber: string; totalPln: number }, extra = "") =>
    `<li><a href="${SITE}/admin/zamowienia?szukaj=${o.orderNumber}">${o.orderNumber}</a> — ${formatPrice(o.totalPln)}${extra}</li>`;
  const body = `
    ${
      expired.length
        ? `<h2 style="font-size:16px">Minął dodatkowy termin — można anulować</h2>
    <ul>${expired.map((o) => li(o)).join("")}</ul>
    <p>Anulowanie w panelu = odstąpienie od umowy; klient dostanie e-mail o zmianie statusu.</p>`
        : ""
    }
    ${
      reminded.length
        ? `<h2 style="font-size:16px">Wysłane przypomnienia o płatności</h2>
    <ul>${reminded.map((o) => li(o, ` — dodatkowy termin do ${plDate(o.due)}`)).join("")}</ul>`
        : ""
    }
  `;
  await sendEmail(resend, {
    from: EMAIL_FROM,
    to: SHOP_INBOX,
    subject: `Nieopłacone zamówienia: ${expired.length} do anulowania, ${reminded.length} przypomnień`,
    html: layout("Nieopłacone zamówienia", body),
  });
}

/**
 * Order cancelled in the admin. Unpaid after a payment reminder → the shop's
 * withdrawal for non-payment (regulamin §5); otherwise a plain cancellation.
 */
export async function sendOrderCancelledEmail(orderId: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      paymentStatus: true,
      paymentReminderSentAt: true,
    },
  });
  if (!order) return;
  const nonPayment = !!order.paymentReminderSentAt && order.paymentStatus !== "CAPTURED";
  const reason = nonPayment
    ? `<p>Nie otrzymaliśmy płatności za zamówienie <strong>${order.orderNumber}</strong> także w
    dodatkowym terminie wskazanym w przypomnieniu, dlatego odstępujemy od umowy (regulamin §5).
    Zamówienie zostało anulowane.</p>`
    : `<p>Zamówienie <strong>${order.orderNumber}</strong> zostało anulowane.</p>`;
  const refund =
    order.paymentStatus === "CAPTURED"
      ? "<p>Zwrot płatności otrzymasz tą samą metodą, którą zapłaciłeś, nie później niż w ciągu 14 dni.</p>"
      : "";
  await sendEmail(resend, {
    from: EMAIL_FROM,
    to: order.customerEmail,
    replyTo: SHOP_INBOX,
    subject: `Zamówienie ${order.orderNumber} zostało anulowane`,
    html: layout(
      "Zamówienie anulowane",
      `<p>Cześć ${escapeHtml(order.customerName)},</p>${reason}${refund}
    <p>W razie pytań odpowiedz na tę wiadomość.</p>`,
    ),
  });
}
