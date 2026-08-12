import { expect, test } from "@playwright/test";
import { prisma } from "../../src/lib/prisma";
import { cleanupOrder, cleanupProduct, RUN_ID, seedActiveProduct } from "./helpers";

const email = `e2e-checkout-${RUN_ID}@example.com`;
let productId: string;
let orderNumber: string | undefined;

test.afterAll(async () => {
  if (orderNumber) await cleanupOrder(orderNumber);
  if (productId) await cleanupProduct(productId);
});

test("browse -> add to cart -> checkout -> confirmation", async ({ page }) => {
  const product = await seedActiveProduct(20, 4990);
  productId = product.id;

  await page.goto(`/produkt/${product.slug}`);
  await expect(page.getByRole("heading", { name: product.namePl })).toBeVisible();
  await page.getByRole("button", { name: "Dodaj do koszyka" }).click();
  await expect(page.getByText("Dodano do koszyka")).toBeVisible();

  await page.goto("/koszyk");
  await expect(page.getByText(product.namePl)).toBeVisible();
  await page.getByRole("link", { name: "Przejdź do kasy" }).click();

  await expect(page).toHaveURL(/\/zamowienie$/);

  // Step 1 — contact + address
  await page.locator("#co-firstName").fill("Jan");
  await page.locator("#co-lastName").fill("Testowy");
  await page.locator("#co-email").fill(email);
  await page.locator("#co-phone").fill("500600700");
  await page.locator("#co-street").fill("Testowa 1");
  await page.locator("#co-postalCode").fill("00-001");
  await page.locator("#co-city").fill("Warszawa");
  await page.getByRole("button", { name: "Dalej: Dostawa →" }).click();

  // Step 2 — shipping method (InPost Kurier avoids the locker-picker requirement)
  await page.locator('input[name="shippingMethod"][value="INPOST_KURIER"]').check();
  await page.getByRole("button", { name: "Dalej: Płatność" }).click();

  // Step 3 — payment + terms
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Złóż zamówienie/ }).click();

  await expect(page).toHaveURL(/\/zamowienie\/potwierdzenie\//, { timeout: 20_000 });

  const order = await prisma.order.findFirst({ where: { customerEmail: email } });
  expect(order).not.toBeNull();
  expect(order?.subtotalPln).toBe(4990);
  orderNumber = order?.orderNumber;

  const variant = await prisma.productVariant.findFirstOrThrow({ where: { productId } });
  expect(variant.stock).toBe(19);
});
