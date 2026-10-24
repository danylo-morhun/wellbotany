import { beforeAll, describe, expect, it } from "vitest";
import { isValidUnsubscribeToken, unsubscribePageUrl } from "@/features/newsletter/lib/unsubscribe";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
});

describe("newsletter unsubscribe link", () => {
  it("is signed for the address, case-insensitively", () => {
    const url = new URL(unsubscribePageUrl("Anna@Example.com"));
    const token = url.searchParams.get("t") ?? "";
    expect(url.searchParams.get("e")).toBe("anna@example.com");
    expect(isValidUnsubscribeToken("anna@example.com", token)).toBe(true);
  });

  it("rejects a token for another address or a forged one", () => {
    const token = new URL(unsubscribePageUrl("anna@example.com")).searchParams.get("t") ?? "";
    expect(isValidUnsubscribeToken("jan@example.com", token)).toBe(false);
    expect(isValidUnsubscribeToken("anna@example.com", "forged")).toBe(false);
  });
});
