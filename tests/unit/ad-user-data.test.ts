import { describe, expect, it } from "vitest";
import {
  hashedContact,
  normalizeEmail,
  normalizePhone,
  sha256,
} from "@/features/ads/lib/user-data";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Anna.Kowalska@WP.pl ")).toBe("anna.kowalska@wp.pl");
  });

  it("drops dots in Gmail local parts only", () => {
    expect(normalizeEmail("Anna.Kowalska@gmail.com")).toBe("annakowalska@gmail.com");
    expect(normalizeEmail("anna.k@googlemail.com")).toBe("annak@googlemail.com");
  });
});

describe("normalizePhone", () => {
  it("adds the Polish prefix to 9-digit numbers", () => {
    expect(normalizePhone("600 100 200")).toBe("48600100200");
    expect(normalizePhone("+48 600-100-200")).toBe("48600100200");
    expect(normalizePhone("0048600100200")).toBe("48600100200");
  });

  it("returns null for non-numbers", () => {
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("hashedContact", () => {
  it("hashes for Google with + and for Meta without", () => {
    const c = hashedContact("A@b.pl", "600100200");
    expect(c.email).toBe(sha256("a@b.pl"));
    expect(c.phoneGoogle).toBe(sha256("+48600100200"));
    expect(c.phoneMeta).toBe(sha256("48600100200"));
    expect(c.email).toMatch(/^[0-9a-f]{64}$/);
  });
});
