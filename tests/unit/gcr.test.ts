import { describe, expect, it } from "vitest";
import { gcrDeliveryDate, showGcrOptIn } from "@/features/reviews/lib/gcr";

describe("gcrDeliveryDate", () => {
  const paid = (iso: string) => ({
    createdAt: new Date("2026-11-01T10:00:00Z"),
    paidAt: new Date(iso),
  });

  it("adds 4 working days to the payment day, skipping the weekend", () => {
    expect(gcrDeliveryDate(paid("2026-11-20T10:00:00Z"))).toBe("2026-11-26"); // Fri → Thu
  });

  it("skips 11 November", () => {
    expect(gcrDeliveryDate(paid("2026-11-09T10:00:00Z"))).toBe("2026-11-16");
  });

  it("skips 24–26 December", () => {
    expect(gcrDeliveryDate(paid("2026-12-22T10:00:00Z"))).toBe("2026-12-30");
  });

  it("counts from the Warsaw day, not the UTC day", () => {
    expect(gcrDeliveryDate(paid("2026-11-16T23:30:00Z"))).toBe("2026-11-23"); // Tue 00:30 in Warsaw
  });

  it("uses the order date for cash on delivery (no paidAt)", () => {
    expect(gcrDeliveryDate({ createdAt: new Date("2026-11-17T10:00:00Z"), paidAt: null })).toBe(
      "2026-11-23",
    );
  });
});

describe("showGcrOptIn", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  const order = {
    status: "PAID",
    paymentStatus: "CAPTURED",
    paymentMethod: "BLIK",
    createdAt: new Date("2026-11-17T10:00:00Z"),
    paidAt: new Date("2026-11-17T10:01:00Z"),
  } as const;

  it("shows for a paid order", () => {
    expect(showGcrOptIn(order, now)).toBe(true);
  });

  it("shows for cash on delivery before payment", () => {
    expect(
      showGcrOptIn(
        {
          ...order,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "CASH_ON_DELIVERY",
          paidAt: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it("hides for an unpaid online or bank transfer order", () => {
    for (const paymentMethod of ["PRZELEWY24", "BANK_TRANSFER"] as const)
      expect(
        showGcrOptIn(
          {
            ...order,
            status: "PAYMENT_PENDING",
            paymentStatus: "PENDING",
            paymentMethod,
            paidAt: null,
          },
          now,
        ),
      ).toBe(false);
  });

  it("hides for a cancelled order", () => {
    expect(showGcrOptIn({ ...order, status: "CANCELLED" }, now)).toBe(false);
  });

  it("hides for an order older than 7 days", () => {
    expect(showGcrOptIn({ ...order, createdAt: new Date("2026-11-10T11:59:00Z") }, now)).toBe(
      false,
    );
    expect(showGcrOptIn({ ...order, createdAt: new Date("2026-11-10T12:00:00Z") }, now)).toBe(true);
  });
});
