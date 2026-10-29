import { describe, expect, it } from "vitest";
import { shopOpenLongEnough, syncProblem } from "@/features/stock-sync/lib/health";

// 2026-10-29 is a Thursday; Warsaw is UTC+1 after the October DST change
const at = (iso: string) => new Date(iso);
const thu1000 = at("2026-10-29T09:00:00Z");

describe("shopOpenLongEnough", () => {
  it("is false right after opening", () =>
    expect(shopOpenLongEnough(at("2026-10-29T08:10:00Z"))).toBe(false));
  it("is true mid-day on a weekday", () => expect(shopOpenLongEnough(thu1000)).toBe(true));
  it("is false after 14:00 on Saturday", () =>
    expect(shopOpenLongEnough(at("2026-10-31T13:30:00Z"))).toBe(false));
  it("is false on Sunday", () =>
    expect(shopOpenLongEnough(at("2026-11-01T11:00:00Z"))).toBe(false));
});

describe("syncProblem", () => {
  it("flags silence over 20 minutes in shop hours", () => {
    expect(syncProblem({ createdAt: at("2026-10-29T08:30:00Z"), error: null }, thu1000)).toBe(
      "silent",
    );
    expect(syncProblem(null, thu1000)).toBe("silent");
  });

  it("flags a rejected last snapshot", () => {
    expect(syncProblem({ createdAt: at("2026-10-29T08:58:00Z"), error: "422" }, thu1000)).toBe(
      "error",
    );
  });

  it("is quiet when recent and fine, or when the shop is closed", () => {
    expect(syncProblem({ createdAt: at("2026-10-29T08:58:00Z"), error: null }, thu1000)).toBeNull();
    expect(syncProblem(null, at("2026-11-01T11:00:00Z"))).toBeNull();
  });
});
