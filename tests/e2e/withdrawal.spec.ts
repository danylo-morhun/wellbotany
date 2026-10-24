import { expect, test } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";
import { cleanupOrder, RUN_ID } from "./helpers";

// Online withdrawal (UPK art. 30 ust. 3, Dyr. 2011/83 art. 11a): two steps,
// the e-mail must match the order, the statement is stored with its time.
const orderNumber = `WB-E2E-${RUN_ID}`.toUpperCase();
const email = `e2e-withdrawal-${RUN_ID}@example.com`;

test.beforeAll(async () => {
  await prisma.order.create({
    data: {
      orderNumber,
      customerEmail: email,
      customerName: "Anna Testowa",
      shippingMethod: "PICKUP",
      shippingCostPln: 0,
      pickupLocation: "KALISZ_MLYNARSKA",
      shipFirstName: "Anna",
      shipLastName: "Testowa",
      paymentMethod: "BANK_TRANSFER",
      subtotalPln: 4990,
      shippingPln: 0,
      taxPln: 0,
      totalPln: 4990,
    },
  });
});

test.afterAll(async () => {
  await cleanupOrder(orderNumber);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cookie-consent", "rejected"));
});

test("footer link → fill in → confirm → stored with an acknowledgement", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Odstąp od umowy tutaj" }).click();
  await expect(page).toHaveURL(/\/odstapienie$/);

  await page.getByLabel("Numer zamówienia *").fill(orderNumber.toLowerCase());
  await page.getByLabel("E-mail podany w zamówieniu *").fill(email.toUpperCase());
  await page.getByLabel("Imię i nazwisko *").fill("Anna Testowa");
  await page.getByRole("button", { name: "Dalej" }).click();

  await expect(page.getByText("wszystkich towarów z zamówienia")).toBeVisible();
  await page.getByRole("button", { name: "Potwierdź odstąpienie od umowy" }).click();
  await expect(page.getByText("Otrzymaliśmy Twoje oświadczenie")).toBeVisible();
  await expect(page.getByText("Data i godzina otrzymania:")).toBeVisible();

  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNumber },
    select: { withdrawals: true },
  });
  expect(order.withdrawals).toHaveLength(1);
  expect(order.withdrawals[0]).toMatchObject({ name: "Anna Testowa", items: "" });
});

test("e-mail that doesn't match the order is refused", async ({ page }) => {
  await page.goto(`/odstapienie?zamowienie=${orderNumber}`);
  await expect(page.getByLabel("Numer zamówienia *")).toHaveValue(orderNumber);
  await page.getByLabel("E-mail podany w zamówieniu *").fill(`other-${RUN_ID}@example.com`);
  await page.getByLabel("Imię i nazwisko *").fill("Ktoś Inny");
  await page.getByRole("button", { name: "Dalej" }).click();
  await page.getByRole("button", { name: "Potwierdź odstąpienie od umowy" }).click();
  await expect(page.getByText("Nie znaleźliśmy zamówienia")).toBeVisible();
});
