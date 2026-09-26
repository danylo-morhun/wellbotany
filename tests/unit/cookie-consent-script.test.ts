import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_BOOT_SCRIPT,
  COOKIE_CONSENT_SCRIPT_HASH,
} from "@/lib/cookie-consent-script";

describe("cookie consent boot script", () => {
  it("matches the hash allowed by the strict CSP", () => {
    const hash = createHash("sha256").update(COOKIE_CONSENT_BOOT_SCRIPT).digest("base64");
    expect(`sha256-${hash}`).toBe(COOKIE_CONSENT_SCRIPT_HASH);
  });
});
