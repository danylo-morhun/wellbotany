import { expect, test } from "@playwright/test";

// CSP only applies to the production build (the e2e webServer runs one). A blocked
// script still returns 200 and renders, so check the browser's CSP reports instead.
// Includes the strict-CSP routes a visitor can open without logging in: a
// prerendered one ships scripts without the per-request nonce and never hydrates.
for (const path of ["/", "/koszyk", "/logowanie", "/rejestracja", "/zamowienie", "/ulubione"]) {
  test(`no CSP violations on ${path}`, async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Content Security Policy")) violations.push(msg.text());
    });

    await page.goto(path);
    await page.waitForLoadState("networkidle");

    expect(violations).toEqual([]);
  });
}
