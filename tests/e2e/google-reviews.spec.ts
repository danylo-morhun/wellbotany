import { expect, test } from "@playwright/test";
import { orderAccessToken } from "../../src/features/checkout/lib/order-access";
import { prisma } from "../../src/lib/prisma";
import { cleanupOrder, RUN_ID } from "./helpers";

// Legal promise (privacy + cookie policy): Google gets nothing until the customer
// clicks "Oceń zakupy w Google". The webServer builds with NEXT_PUBLIC_GCR_MERCHANT_ID.
// AUTH_SECRET signs the ?dostep= link — the test reads the same .env.local as the server.
const orderNumber = `E2E-GCR-${RUN_ID}`;

test.afterAll(async () => {
  await cleanupOrder(orderNumber);
});

test("Google Customer Reviews loads only after the click", async ({ page }) => {
  await prisma.order.create({
    data: {
      orderNumber,
      status: "PENDING",
      customerEmail: `e2e-gcr-${RUN_ID}@example.com`,
      customerName: "Jan Testowy",
      shippingMethod: "PICKUP",
      shippingCostPln: 0,
      shipFirstName: "Jan",
      shipLastName: "Testowy",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotalPln: 4990,
      shippingPln: 0,
      taxPln: 933,
      totalPln: 4990,
    },
  });

  // Every external request is recorded and aborted — nothing leaves the test.
  const external: string[] = [];
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      external.push(route.request().url());
      return route.abort();
    },
  );
  const google = () => external.filter((u) => /\/\/(apis|www)\.google\.com\//.test(u));
  await page.addInitScript(() => localStorage.setItem("cookie-consent", "rejected"));

  await page.goto(
    `/zamowienie/potwierdzenie/${orderNumber}?dostep=${orderAccessToken(orderNumber)}`,
  );
  const button = page.getByRole("button", { name: "Oceń zakupy w Google" });
  await expect(button).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(google()).toEqual([]);

  await button.click();
  await expect(button).toBeHidden();
  await expect
    .poll(google)
    .toContainEqual(expect.stringContaining("apis.google.com/js/platform.js"));
});
