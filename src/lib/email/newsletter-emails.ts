import { EMAIL_FROM, resendClient, sendEmail } from "./client";
import { layout } from "./layout";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

export async function sendWelcomeCouponEmail(input: {
  email: string;
  code: string;
  percent: number;
  validUntil: Date;
}): Promise<void> {
  const resend = resendClient();
  if (!resend) return;

  const until = input.validUntil.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
  // ?kod= is remembered by the storefront and pre-filled in the cart and at checkout
  const shopUrl = `${SITE_URL}/?kod=${encodeURIComponent(input.code)}`;
  const body = `
    <p>Dziękujemy za zapis do newslettera Well Botany!</p>
    <p>Twój kod na -${input.percent}% na zamówienie:</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:2px;margin:16px 0">${input.code}</p>
    <p>Wpisz go w koszyku albo przy kasie. Kod jest jednorazowy i ważny do ${until}.</p>
    <p style="margin-top:24px"><a href="${shopUrl}" style="display:inline-block;background:#0f7a5c;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Przejdź do sklepu</a></p>
    <p style="margin-top:24px;font-size:12px;color:#767676">Z newslettera wypiszesz się w każdej chwili — wystarczy odpowiedzieć na tę wiadomość.</p>`;

  await sendEmail(resend, {
    from: EMAIL_FROM,
    to: input.email,
    subject: `Twój kod -${input.percent}% do Well Botany`,
    html: layout("Witamy w Well Botany", body),
  });
}
