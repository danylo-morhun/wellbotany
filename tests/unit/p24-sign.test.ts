import { describe, expect, it } from "vitest";
import { p24Sign } from "@/features/przelewy24/lib/sign";

describe("p24Sign", () => {
  const payload = {
    merchantId: 1,
    posId: 1,
    sessionId: "TZ-2026-00001",
    amount: 1000,
    originAmount: 1000,
    currency: "PLN",
    orderId: 12345,
    methodId: 1,
    statement: "test",
    crc: "abc",
  };

  it("matches the known SHA384 digest for a fixed payload (regression pin)", () => {
    expect(p24Sign(payload)).toBe(
      "0c0ec4d077436b0493d492360592bd569aba2222b62d9eab241dd8bf5f79482a52061fd6bb24aad8827c0074b076f799",
    );
  });

  it("is deterministic for the same input", () => {
    expect(p24Sign(payload)).toBe(p24Sign({ ...payload }));
  });

  it("changes when any field changes", () => {
    expect(p24Sign(payload)).not.toBe(p24Sign({ ...payload, amount: 1001 }));
  });
});
