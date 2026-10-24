import { formatReceivedAt, withdrawalStatement } from "@/features/withdrawal/lib/statement";
import { prisma } from "@/lib/prisma";
import { SELLER } from "@/lib/seller";
import { EMAIL_FROM, resendClient, sendEmail } from "./client";
import { escapeHtml, layout } from "./layout";

const SHOP_NOTIFY_FALLBACK = "kontakt@wellbotany.pl";

/**
 * Acknowledgement on a durable medium with the statement and its date and time
 * (UPK art. 30 ust. 4; Dyr. 2011/83 art. 11a ust. 3), plus a note to the shop inbox.
 */
export async function sendWithdrawalEmails(withdrawalId: string): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    select: {
      name: true,
      email: true,
      items: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });
  if (!withdrawal) return;

  const { orderNumber } = withdrawal.order;
  const receivedAt = formatReceivedAt(withdrawal.createdAt);
  const statement = escapeHtml(
    withdrawalStatement({ name: withdrawal.name, orderNumber, items: withdrawal.items }),
  );

  const customerBody = `
    <p>Potwierdzamy otrzymanie Twojego oświadczenia o odstąpieniu od umowy.</p>
    <p>Data i godzina otrzymania: <strong>${receivedAt}</strong></p>
    <p style="padding:12px;background:#f5f5f5;border-radius:8px">${statement}</p>
    <h2 style="font-size:16px;margin-top:24px">Co dalej</h2>
    <p>Odeślij towar na adres ${SELLER.legalName}, ${SELLER.address} w ciągu 14 dni od dziś. Bezpośredni koszt odesłania ponosisz Ty.</p>
    <p>Zwrócimy wszystkie płatności, w tym koszt dostawy (do wysokości najtańszego zwykłego sposobu dostawy), nie później niż 14 dni od otrzymania tego oświadczenia, tą samą metodą płatności. Możemy wstrzymać się ze zwrotem do czasu otrzymania towaru lub dowodu jego odesłania.</p>
    <p>Pytania? Odpowiedz na tę wiadomość lub napisz na ${SELLER.email}.</p>
  `;

  const shopBody = `
    <p>Zamówienie: <strong>${orderNumber}</strong> · otrzymano ${receivedAt}</p>
    <p>${statement}</p>
    <p>Klient: ${escapeHtml(withdrawal.name)}, ${escapeHtml(withdrawal.email)}</p>
    <p>Zwrot płatności: do 14 dni od dziś (art. 32 ustawy o prawach konsumenta).</p>
  `;

  await Promise.all([
    sendEmail(resend, {
      from: EMAIL_FROM,
      to: withdrawal.email,
      replyTo: SELLER.email,
      subject: `Potwierdzenie odstąpienia od umowy — zamówienie ${orderNumber}`,
      html: layout("Otrzymaliśmy Twoje odstąpienie od umowy", customerBody),
    }),
    sendEmail(resend, {
      from: EMAIL_FROM,
      to: process.env.SHOP_NOTIFY_EMAIL || SHOP_NOTIFY_FALLBACK,
      replyTo: withdrawal.email,
      subject: `Odstąpienie od umowy — ${orderNumber}`,
      html: layout("Odstąpienie od umowy", shopBody),
    }),
  ]);
}
