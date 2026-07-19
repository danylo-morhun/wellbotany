import { expect, test } from "@playwright/test";
import { cleanupCustomerByEmail, RUN_ID } from "./helpers";

const email = `e2e-user-${RUN_ID}@example.com`;
const password = "TestPass123!";

test.afterAll(async () => {
  await cleanupCustomerByEmail(email);
});

test("register, auto-login, logout, then log back in", async ({ page }) => {
  await page.goto("/rejestracja");

  await page.getByLabel("Imię").fill("Jan");
  await page.getByLabel("Nazwisko").fill("Testowy");
  await page.locator("#reg-email").fill(email);
  await page.locator("#reg-password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Zarejestruj się" }).click();

  await expect(page).toHaveURL(/\/konto/, { timeout: 15_000 });

  await page.getByRole("button", { name: "Wyloguj się", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Wyloguj się" }).click();

  await page.goto("/logowanie");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await expect(page).toHaveURL(/\/konto/, { timeout: 15_000 });
});
