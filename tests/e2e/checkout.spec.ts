import { expect, type Page, test } from "@playwright/test";
import { shippingCostFor } from "../../src/features/checkout/lib/shipping";
import { prisma } from "../../src/lib/prisma";
import {
  cleanupCustomerByEmail,
  cleanupOrder,
  cleanupProduct,
  RUN_ID,
  seedActiveProduct,
  seedAdmin,
  seedCustomer,
} from "./helpers";

// Online payments stay hidden until P24_ENABLED=true, so the matrix covers what
// ships now: 4 delivery methods × bank transfer / cash at pickup, guest and
// logged-in, with and without faktura, then the admin side (paid → shipped).
// E2E_EMAIL (e.g. delivered@resend.dev) sends the real e-mails to that inbox.
const guestEmail = (tag: string) => process.env.E2E_EMAIL ?? `e2e-${tag}-${RUN_ID}@example.com`;

const productIds: string[] = [];
const orderNumbers: string[] = [];
const customerEmails: string[] = [];

// Consent already given — the banner would otherwise cover the checkout buttons on mobile
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cookie-consent", "rejected"));
});

test.afterAll(async () => {
  for (const n of orderNumbers) await cleanupOrder(n);
  for (const id of productIds) await cleanupProduct(id);
  for (const e of customerEmails) await cleanupCustomerByEmail(e);
});

async function addToCartAndOpenCheckout(page: Page, pricePln = 4990) {
  const product = await seedActiveProduct(20, pricePln);
  productIds.push(product.id);
  await page.goto(`/produkt/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: product.namePl })).toBeVisible();
  await page.getByRole("button", { name: "Dodaj do koszyka" }).first().click();
  await expect(page.getByText("Dodano do koszyka")).toBeVisible();
  await page.goto("/koszyk");
  await expect(page.getByText(product.namePl).first()).toBeVisible();
  await page.getByRole("link", { name: "Przejdź do kasy" }).click();
  await expect(page).toHaveURL(/\/zamowienie$/);
  return product;
}

async function fillContact(page: Page, email: string) {
  await page.locator("#co-firstName").fill("Jan");
  await page.locator("#co-lastName").fill("Testowy");
  await page.locator("#co-email").fill(email);
  await page.locator("#co-phone").fill("500600700");
  await page.getByRole("button", { name: "Dalej: Dostawa →" }).click();
}

async function fillAddress(page: Page) {
  await page.locator("#co-street").fill("Testowa 1");
  await page.locator("#co-postalCode").fill("00-001");
  await page.locator("#co-city").fill("Warszawa");
}

async function chooseShipping(page: Page, method: string) {
  await page.locator(`input[name="shippingMethod"][value="${method}"]`).check();
}

async function pay(page: Page, method: "BANK_TRANSFER" | "CASH_ON_DELIVERY") {
  await page.getByRole("button", { name: "Dalej: Płatność" }).click();
  // Online methods are off (P24_ENABLED unset) — only offline ones are offered
  for (const hidden of ["BLIK", "PRZELEWY24", "APPLE_PAY", "GOOGLE_PAY"]) {
    await expect(page.locator(`input[name="paymentMethod"][value="${hidden}"]`)).toHaveCount(0);
  }
  await page.locator(`input[name="paymentMethod"][value="${method}"]`).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Złóż zamówienie/ }).click();
  await expect(page).toHaveURL(/\/zamowienie\/potwierdzenie\//, { timeout: 20_000 });
  const orderNumber = decodeURIComponent(page.url().split("/").pop() ?? "");
  orderNumbers.push(orderNumber);
  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNumber },
    include: { items: true },
  });
  if (method === "BANK_TRANSFER") {
    await expect(page.getByRole("heading", { name: "Dane do przelewu" })).toBeVisible();
  }
  return order;
}

async function expectedShipping(
  method: "INPOST_PACZKOMAT" | "INPOST_KURIER" | "ORLEN_PACZKA" | "PICKUP",
  productsPln: number,
) {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const threshold = settings ? settings.freeShippingThresholdPln : 20000;
  return shippingCostFor(method, productsPln, threshold);
}

test("@mobile InPost Paczkomat picked on the map + bank transfer, guest", async ({ page }) => {
  const product = await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("paczkomat"));
  await chooseShipping(page, "INPOST_PACZKOMAT");
  // Address fields are only for courier delivery
  await expect(page.locator("#co-street")).toHaveCount(0);

  await page.getByRole("button", { name: "Wybierz na mapie" }).click();
  // The map shows every carrier — narrow it to InPost so the first point is a paczkomat
  await page.getByRole("button", { name: /^InPost Paczkomat/ }).click();
  await page.getByPlaceholder("Miasto, ulica lub kod punktu").fill("Kalisz");
  await page.getByPlaceholder("Miasto, ulica lub kod punktu").press("Enter");
  await page
    .getByRole("button", { name: "Wybierz", exact: true })
    .first()
    .click({ timeout: 20_000 });
  await expect(page.getByText("Wybrany paczkomat")).toBeVisible();

  const order = await pay(page, "BANK_TRANSFER");
  expect(order.shippingMethod).toBe("INPOST_PACZKOMAT");
  expect(order.inpostMachineId).toMatch(/^[A-Z0-9-]+$/);
  expect(order.inpostMachineName).toBeTruthy();
  expect(order.shipStreet).toBeNull();
  expect(order.paymentMethod).toBe("BANK_TRANSFER");
  expect(order.paymentStatus).toBe("PENDING");
  expect(order.customerId).toBeNull();
  expect(order.subtotalPln).toBe(4990);
  expect(order.shippingPln).toBe(await expectedShipping("INPOST_PACZKOMAT", 4990));
  expect(order.totalPln).toBe(order.subtotalPln + order.shippingPln - order.discountPln);
  expect(order.items).toHaveLength(1);

  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { productId: product.id },
  });
  expect(variant.stock).toBe(19);
});

test("Orlen Paczka typed by hand + bank transfer + faktura", async ({ page }) => {
  await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("orlen"));
  await chooseShipping(page, "ORLEN_PACZKA");
  await page.locator("#co-pointCode").fill("KA-123264-W9-15");

  await page.getByText("Chcę fakturę VAT").click();
  await page.locator("#billCompany").fill("Testowa Sp. z o.o.");
  await page.locator("#billStreet").fill("Firmowa 2");
  await page.locator("#billPostalCode").fill("62-800");
  await page.locator("#billCity").fill("Kalisz");
  // Checksum is validated before the payment step
  await page.locator("#billNip").fill("1234567890");
  await page.getByRole("button", { name: "Dalej: Płatność" }).click();
  await expect(page.getByText("Nieprawidłowy NIP")).toBeVisible();
  await page.locator("#billNip").fill("5260250274");

  const order = await pay(page, "BANK_TRANSFER");
  expect(order.shippingMethod).toBe("ORLEN_PACZKA");
  expect(order.inpostMachineId).toBe("KA-123264-W9-15");
  expect(order.wantsFaktura).toBe(true);
  expect(order.billCompany).toBe("Testowa Sp. z o.o.");
  expect(order.billNip).toBe("5260250274");
  expect(order.billCity).toBe("Kalisz");
  expect(order.shippingPln).toBe(await expectedShipping("ORLEN_PACZKA", 4990));
});

test("InPost Kurier + bank transfer; cash is not offered for delivery", async ({ page }) => {
  await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("kurier"));
  await chooseShipping(page, "INPOST_KURIER");
  await fillAddress(page);
  await page.getByRole("button", { name: "Dalej: Płatność" }).click();
  await expect(page.locator('input[name="paymentMethod"][value="CASH_ON_DELIVERY"]')).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: /Wstecz|←/ })
    .first()
    .click();

  const order = await pay(page, "BANK_TRANSFER");
  expect(order.shippingMethod).toBe("INPOST_KURIER");
  expect(order.shipStreet).toBe("Testowa 1");
  expect(order.shipPostalCode).toBe("00-001");
  expect(order.shipCity).toBe("Warszawa");
  expect(order.inpostMachineId).toBeNull();
  expect(order.wantsFaktura).toBe(false);
  expect(order.shippingPln).toBe(await expectedShipping("INPOST_KURIER", 4990));
});

test("@mobile store pickup + cash at pickup", async ({ page }) => {
  await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("pickup-cash"));
  await chooseShipping(page, "PICKUP");
  await page.locator('input[name="pickupLocation"][value="KALISZ_POLNA"]').check();

  const order = await pay(page, "CASH_ON_DELIVERY");
  expect(order.shippingMethod).toBe("PICKUP");
  expect(order.pickupLocation).toBe("KALISZ_POLNA");
  expect(order.paymentMethod).toBe("CASH_ON_DELIVERY");
  expect(order.shippingPln).toBe(0);
  await expect(page.getByRole("heading", { name: "Dane do przelewu" })).toHaveCount(0);
});

test("store pickup + bank transfer, free-shipping threshold ignored for pickup", async ({
  page,
}) => {
  await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("pickup-transfer"));
  await chooseShipping(page, "PICKUP");
  await page.locator('input[name="pickupLocation"][value="KALISZ_MLYNARSKA"]').check();

  const order = await pay(page, "BANK_TRANSFER");
  expect(order.pickupLocation).toBe("KALISZ_MLYNARSKA");
  expect(order.paymentMethod).toBe("BANK_TRANSFER");
  expect(order.shippingPln).toBe(0);
});

test("free delivery above the threshold (InPost Kurier)", async ({ page }) => {
  await addToCartAndOpenCheckout(page, 25000);
  await fillContact(page, guestEmail("free"));
  await chooseShipping(page, "INPOST_KURIER");
  await fillAddress(page);
  const order = await pay(page, "BANK_TRANSFER");
  expect(order.subtotalPln).toBe(25000);
  expect(order.shippingPln).toBe(await expectedShipping("INPOST_KURIER", 25000));
});

test("logged-in customer: order is linked to the account and listed in /konto", async ({
  page,
}) => {
  const { customer, password } = await seedCustomer();
  customerEmails.push(customer.email);
  await page.goto("/logowanie");
  await page.locator("#email").fill(customer.email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(page).toHaveURL(/\/konto/, { timeout: 15_000 });

  await addToCartAndOpenCheckout(page);
  await fillContact(page, customer.email);
  await chooseShipping(page, "INPOST_PACZKOMAT");
  await page.locator("#co-pointCode").fill("KAL01M");
  const order = await pay(page, "BANK_TRANSFER");
  expect(order.customerId).toBe(customer.id);

  await page.goto("/konto/zamowienia");
  await expect(page.getByText(order.orderNumber)).toBeVisible();
});

test("admin: mark as paid, then shipped with a tracking number", async ({ page, browser }) => {
  await addToCartAndOpenCheckout(page);
  await fillContact(page, guestEmail("admin"));
  await chooseShipping(page, "INPOST_PACZKOMAT");
  await page.locator("#co-pointCode").fill("KAL01M");
  const order = await pay(page, "BANK_TRANSFER");

  const { admin, password } = await seedAdmin();
  customerEmails.push(admin.email);
  const ctx = await browser.newContext();
  const adminPage = await ctx.newPage();
  await adminPage.goto("/logowanie");
  await adminPage.locator("#email").fill(admin.email);
  await adminPage.locator("#password").fill(password);
  await adminPage.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(adminPage).not.toHaveURL(/\/logowanie/, { timeout: 15_000 });

  await adminPage.goto(`/admin/zamowienia/${order.id}`);
  adminPage.once("dialog", (d) => d.accept());
  await adminPage.getByRole("button", { name: "Oznacz jako opłacone" }).click();
  await expect(adminPage.getByText("Zamówienie oznaczone jako opłacone")).toBeVisible();
  await expect
    .poll(
      async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus,
    )
    .toBe("CAPTURED");

  await adminPage.reload();
  await adminPage.locator("#status").selectOption("SHIPPED");
  await adminPage.locator("#trackingNumber").fill("620000000000000000000001");
  await adminPage.getByRole("button", { name: "Zapisz" }).click();
  await expect(adminPage.getByText("Status zamówienia zaktualizowany")).toBeVisible();

  const shipped = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(shipped.status).toBe("SHIPPED");
  expect(shipped.trackingNumber).toBe("620000000000000000000001");
  expect(shipped.shippedAt).not.toBeNull();
  await ctx.close();
});
