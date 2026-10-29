import { describe, expect, it } from "vitest";
import { agentExpected, heartbeatProblem } from "@/features/stock-sync/lib/heartbeat";

// Warsaw is UTC+1 in winter, UTC+2 in summer
const warsaw = (iso: string) => new Date(iso);

describe("agentExpected", () => {
  it("expects the agent on weekdays 9:20–18:00 and Saturdays 9:20–14:00", () => {
    expect(agentExpected(warsaw("2026-11-02T08:30:00Z"))).toBe(true); // Mon 9:30
    expect(agentExpected(warsaw("2026-11-02T08:10:00Z"))).toBe(false); // Mon 9:10, still starting up
    expect(agentExpected(warsaw("2026-11-02T17:05:00Z"))).toBe(false); // Mon 18:05
    expect(agentExpected(warsaw("2026-11-07T12:00:00Z"))).toBe(true); // Sat 13:00
    expect(agentExpected(warsaw("2026-11-07T13:30:00Z"))).toBe(false); // Sat 14:30
    expect(agentExpected(warsaw("2026-11-08T10:00:00Z"))).toBe(false); // Sunday
  });

  it("uses Warsaw time across the summer offset", () => {
    expect(agentExpected(warsaw("2026-06-15T07:30:00Z"))).toBe(true); // Mon 9:30 CEST
    expect(agentExpected(warsaw("2026-06-15T16:30:00Z"))).toBe(false); // Mon 18:30 CEST
  });

  it("does not expect it on public holidays", () => {
    expect(agentExpected(warsaw("2026-11-11T10:00:00Z"))).toBe(false); // Independence Day, Wed
    expect(agentExpected(warsaw("2027-03-29T10:00:00Z"))).toBe(false); // Easter Monday 2027
    expect(agentExpected(warsaw("2026-06-04T10:00:00Z"))).toBe(false); // Corpus Christi 2026
    expect(agentExpected(warsaw("2026-12-24T10:00:00Z"))).toBe(false); // Christmas Eve
  });
});

describe("heartbeatProblem", () => {
  const open = warsaw("2026-11-02T10:00:00Z"); // Mon 11:00

  it("is fine with a recent beat or while the shop is closed", () => {
    expect(heartbeatProblem("2026-11-02T09:55:00Z", open)).toBeNull();
    expect(heartbeatProblem(null, warsaw("2026-11-08T10:00:00Z"))).toBeNull();
  });

  it("reports a silent or missing agent during shop hours", () => {
    expect(heartbeatProblem("2026-11-02T09:30:00Z", open)).toMatch(/30 min/);
    expect(heartbeatProblem(null, open)).toMatch(/no heartbeat/);
    expect(heartbeatProblem("garbage", open)).toMatch(/no heartbeat/);
  });
});
