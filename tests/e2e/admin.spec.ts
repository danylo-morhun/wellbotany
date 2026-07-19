import { expect, test } from "@playwright/test";
import { cleanupCustomerByEmail, cleanupProduct, seedActiveProduct, seedAdmin } from "./helpers";

let productId: string;
let adminEmail: string;
let adminPassword: string;

test.afterAll(async () => {
  if (productId) await cleanupProduct(productId);
  if (adminEmail) await cleanupCustomerByEmail(adminEmail);
});

test("admin can log in and sees the product catalog", async ({ page }) => {
  const product = await seedActiveProduct();
  productId = product.id;
  const { admin, password } = await seedAdmin();
  adminEmail = admin.email;
  adminPassword = password;

  // Anonymous visitors must be bounced from /admin (src/proxy.ts guard).
  await page.goto("/admin/produkty");
  await expect(page).toHaveURL(/\/logowanie/);

  await page.locator("#email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  // Login honors the original ?callbackUrl, so it lands straight on
  // /admin/produkty rather than the default /konto redirect.
  await expect(page).not.toHaveURL(/\/logowanie/, { timeout: 15_000 });

  await page.goto("/admin/produkty");
  await expect(page).toHaveURL(/\/admin\/produkty/);
  await expect(page.getByText(product.namePl)).toBeVisible();

  await page.goto("/admin/zamowienia");
  await expect(page).toHaveURL(/\/admin\/zamowienia/);
});
