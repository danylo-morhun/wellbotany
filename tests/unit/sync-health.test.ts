import { describe, expect, it } from "vitest";
import { syncProblem } from "@/features/stock-sync/lib/health";

// 2026-10-29 is a Thursday; Warsaw is UTC+1 after the October DST change
const at = (iso: string) => new Date(iso);
const thu1000 = at("2026-10-29T09:00:00Z");
const ok = { error: null };

describe("syncProblem", () => {
  it("flags a heartbeat silent over 15 minutes in shop hours", () => {
    expect(syncProblem("2026-10-29T08:30:00Z", ok, thu1000)).toBe("silent");
    expect(syncProblem(null, ok, thu1000)).toBe("silent");
  });

  it("is not fooled by an old SyncRun while the heartbeat is fresh", () => {
    expect(syncProblem("2026-10-29T08:58:00Z", ok, thu1000)).toBeNull();
    expect(syncProblem("2026-10-29T08:58:00Z", null, thu1000)).toBeNull();
  });

  it("flags a rejected last snapshot", () => {
    expect(syncProblem("2026-10-29T08:58:00Z", { error: "422" }, thu1000)).toBe("error");
  });

  it("is quiet about silence when the shop is closed", () => {
    expect(syncProblem(null, ok, at("2026-11-01T11:00:00Z"))).toBeNull();
  });
});
