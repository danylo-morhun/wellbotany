import { describe, expect, it } from "vitest";
import { defaultPaymentMethod, isPaymentMethodAvailable } from "@/features/checkout/lib/payment";

describe("isPaymentMethodAvailable", () => {
  it("hides the traditional transfer while Przelewy24 is on", () => {
    expect(isPaymentMethodAvailable("BANK_TRANSFER", true)).toBe(false);
    expect(isPaymentMethodAvailable("BLIK", true)).toBe(true);
    expect(defaultPaymentMethod(true)).toBe("BLIK");
  });

  it("falls back to the traditional transfer while Przelewy24 is off", () => {
    expect(isPaymentMethodAvailable("BANK_TRANSFER", false)).toBe(true);
    expect(isPaymentMethodAvailable("BLIK", false)).toBe(false);
    expect(defaultPaymentMethod(false)).toBe("BANK_TRANSFER");
  });
});
