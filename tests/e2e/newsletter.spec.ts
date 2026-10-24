import { expect, test } from "@playwright/test";
import {
  unsubscribeOneClickUrl,
  unsubscribePageUrl,
} from "../../src/features/newsletter/lib/unsubscribe";
import { prisma } from "../../src/lib/prisma";
import { RUN_ID } from "./helpers";

// The links are signed with AUTH_SECRET — the test reads the same .env.local as the server
const local = (url: string) => url.replace(/^https?:\/\/[^/]+/, "");

test("unsubscribe page removes the subscriber after confirming", async ({ page }) => {
  const email = `e2e-unsub-${RUN_ID}@example.com`;
  await prisma.newsletterSubscriber.create({ data: { email } });
  await page.addInitScript(() => localStorage.setItem("cookie-consent", "rejected"));

  await page.goto(local(unsubscribePageUrl(email)));
  // Opening the link alone (as a mail scanner would) must not unsubscribe
  expect(await prisma.newsletterSubscriber.count({ where: { email } })).toBe(1);
  await page.getByRole("button", { name: "Wypisz mnie z newslettera" }).click();
  await expect(page.getByText(`Wypisaliśmy ${email} z newslettera`)).toBeVisible();
  expect(await prisma.newsletterSubscriber.count({ where: { email } })).toBe(0);
});

test("one-click POST unsubscribes; a forged token is refused", async ({ request }) => {
  const email = `e2e-oneclick-${RUN_ID}@example.com`;
  await prisma.newsletterSubscriber.create({ data: { email } });

  const forged = await request.post(`/api/newsletter/unsubscribe?e=${email}&t=forged`);
  expect(forged.status()).toBe(400);
  expect(await prisma.newsletterSubscriber.count({ where: { email } })).toBe(1);

  const ok = await request.post(local(unsubscribeOneClickUrl(email)), {
    form: { "List-Unsubscribe": "One-Click" },
  });
  expect(ok.status()).toBe(200);
  expect(await prisma.newsletterSubscriber.count({ where: { email } })).toBe(0);
});
