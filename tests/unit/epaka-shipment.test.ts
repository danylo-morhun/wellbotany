import { describe, expect, it } from "vitest";
import {
  buildEpakaOrderBody,
  parsePointAddress,
  splitStreet,
} from "@/features/shipping/lib/shipment";

describe("splitStreet", () => {
  it.each([
    ["ul. Kościuszki 1a", { street: "ul. Kościuszki", houseNumber: "1a", flatNumber: "" }],
    ["Polna 102/5", { street: "Polna", houseNumber: "102", flatNumber: "5" }],
    ["Aleja 3 Maja 12 m. 4", { street: "Aleja 3 Maja", houseNumber: "12", flatNumber: "4" }],
    ["Rynek", { street: "Rynek", houseNumber: "", flatNumber: "" }],
  ])("%s", (line, expected) => {
    expect(splitStreet(line)).toEqual(expected);
  });
});

describe("buildEpakaOrderBody", () => {
  const base = {
    courierId: 20,
    receiver: {
      firstName: "Anna",
      lastName: "Nowak",
      street: "Ostrowska",
      houseNumber: "53B",
      postCode: "62-800",
      city: "Kalisz",
      phone: "500600700",
      email: "a@example.com",
      pointId: "PL82690",
    },
    package: { weight: 1, length: 30, width: 20, height: 10 },
    orderNumber: "TZ-2026-00001",
  };

  const pickup = { date: "2026-10-05", from: "10:00", to: "16:00" };

  it("sends the point and courier pickup slot", () => {
    const body = buildEpakaOrderBody({ ...base, pickup });
    expect(body.receiver).toMatchObject({
      pointId: "PL82690",
      pointDescription: "PL82690",
      name: "Anna",
      country: "PL",
    });
    expect(body.pickupDate).toBe("2026-10-05");
    expect(body.pickupTime).toEqual({ from: "10:00", to: "16:00" });
    expect(body.paymentData).toEqual({ paymentType: "balance" });
    expect(body.packages).toEqual([{ weight: 1, length: 30, width: 20, height: 10, type: 0 }]);
    expect(body.sender).not.toHaveProperty("pointId");
  });

  it("drop-off at a point carries the sender point", () => {
    const body = buildEpakaOrderBody({
      ...base,
      pickup,
      senderPoint: { id: "EPK0132", description: "epaka Kalisz" },
    });
    expect(body.sender).toMatchObject({ pointId: "EPK0132", pointDescription: "epaka Kalisz" });
  });
});

describe("parsePointAddress", () => {
  it("reads the address saved with the point at checkout", () => {
    expect(parsePointAddress("PL82690 — Ostrowska 53B, 62-800 Kalisz")).toEqual({
      street: "Ostrowska 53B",
      postCode: "62-800",
      city: "Kalisz",
    });
  });

  it("returns null for a manually typed code", () => {
    expect(parsePointAddress(null)).toBeNull();
    expect(parsePointAddress("Paczkomat KAL06M")).toBeNull();
  });
});
