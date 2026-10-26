import { describe, expect, it } from "vitest";
import { formatPlnInput, parsePlnInput } from "@/features/products/lib/price-input";

describe("formatPlnInput", () => {
  it("uses a decimal comma", () => {
    expect(formatPlnInput(1299)).toBe("12,99");
    expect(formatPlnInput(500)).toBe("5,00");
  });
});

describe("parsePlnInput", () => {
  it("accepts comma, dot and spaces", () => {
    expect(parsePlnInput("12,99")).toBe(1299);
    expect(parsePlnInput("12.99")).toBe(1299);
    expect(parsePlnInput("1 299,00")).toBe(129900);
    expect(parsePlnInput("5")).toBe(500);
    expect(parsePlnInput("5,5 zł")).toBe(550);
  });

  it("rejects non-positive and malformed amounts", () => {
    expect(parsePlnInput("")).toBeNull();
    expect(parsePlnInput("0")).toBeNull();
    expect(parsePlnInput("-3")).toBeNull();
    expect(parsePlnInput("12,999")).toBeNull();
    expect(parsePlnInput("abc")).toBeNull();
    expect(parsePlnInput("1,2,3")).toBeNull();
  });
});
