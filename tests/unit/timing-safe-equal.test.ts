import { describe, expect, it } from "vitest";
import { safeCompare } from "@/lib/timing-safe-equal";

describe("safeCompare", () => {
  it("returns true for identical strings", () => {
    expect(safeCompare("secret-token", "secret-token")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(safeCompare("secret-token", "wrong-token")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(() => safeCompare("short", "a-much-longer-string")).not.toThrow();
    expect(safeCompare("short", "a-much-longer-string")).toBe(false);
  });

  it("treats empty strings as equal to each other but not to a real secret", () => {
    expect(safeCompare("", "")).toBe(true);
    expect(safeCompare("", "secret")).toBe(false);
  });
});
