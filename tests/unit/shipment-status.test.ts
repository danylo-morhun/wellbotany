import { describe, expect, it } from "vitest";
import { handOverDeadline } from "@/features/shipping/lib/shipment-status";

describe("handOverDeadline", () => {
  it("is the end of the next day for a weekday label", () => {
    // Tuesday 10:00 UTC → Wednesday 17:00 UTC
    expect(handOverDeadline(new Date("2026-11-17T10:00:00Z")).toISOString()).toBe(
      "2026-11-18T17:00:00.000Z",
    );
  });

  it("skips the weekend for a Friday label", () => {
    expect(handOverDeadline(new Date("2026-11-20T15:00:00Z")).toISOString()).toBe(
      "2026-11-23T17:00:00.000Z",
    );
  });

  it("skips Sunday for a Saturday label", () => {
    expect(handOverDeadline(new Date("2026-11-21T09:00:00Z")).toISOString()).toBe(
      "2026-11-23T17:00:00.000Z",
    );
  });
});
