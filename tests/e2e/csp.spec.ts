import { expect, test } from "@playwright/test";

// CSP only applies to the production build (the e2e webServer runs one). A blocked
// script still returns 200 and renders, so check the browser's CSP reports instead.
for (const path of ["/", "/koszyk", "/logowanie"]) {
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
