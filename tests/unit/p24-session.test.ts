import { describe, expect, it } from "vitest";
import { orderNumberFromSession, retrySessionId } from "@/features/przelewy24/lib/session";

describe("p24 session ids", () => {
  it("maps first and retry attempts back to the order", () => {
    expect(orderNumberFromSession("TZ-2026-00012")).toBe("TZ-2026-00012");
    const retry = retrySessionId("TZ-2026-00012", 1_763_000_000_000);
    expect(retry).toMatch(/^TZ-2026-00012-p[0-9a-z]+$/);
    expect(retry.length).toBeLessThanOrEqual(100);
    expect(orderNumberFromSession(retry)).toBe("TZ-2026-00012");
  });
});
