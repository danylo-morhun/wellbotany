import { describe, expect, it } from "vitest";
import { CAMPAIGNS, campaignToRender, isCampaignLive } from "@/features/home/lib/campaign";

const blackWeek = {
  id: "bw",
  title: "Black Week",
  note: "",
  startsAt: new Date("2026-11-23T00:00:00+01:00"),
  endsAt: new Date("2026-12-01T00:00:00+01:00"),
};

describe("isCampaignLive", () => {
  it("is on from the first moment to the last minute", () => {
    expect(isCampaignLive(blackWeek, new Date("2026-11-23T00:00:00+01:00"))).toBe(true);
    expect(isCampaignLive(blackWeek, new Date("2026-11-30T23:59:59+01:00"))).toBe(true);
  });

  it("is off before the start and from the end on", () => {
    expect(isCampaignLive(blackWeek, new Date("2026-11-22T23:59:59+01:00"))).toBe(false);
    expect(isCampaignLive(blackWeek, new Date("2026-12-01T00:00:00+01:00"))).toBe(false);
  });
});

describe("campaignToRender", () => {
  it("renders an hour ahead so a cached page already has it at the start", () => {
    expect(campaignToRender(new Date("2026-11-22T23:01:00+01:00"), [blackWeek])).toBe(blackWeek);
    expect(campaignToRender(new Date("2026-11-22T22:59:00+01:00"), [blackWeek])).toBeNull();
  });

  it("stops at the end", () => {
    expect(campaignToRender(new Date("2026-11-30T23:59:00+01:00"), [blackWeek])).toBe(blackWeek);
    expect(campaignToRender(new Date("2026-12-01T00:00:00+01:00"), [blackWeek])).toBeNull();
  });

  it("Black Week 2026 ends after Monday 30.11 23:59 Polish time", () => {
    const bw = CAMPAIGNS.find((c) => c.id === "black-week-2026");
    expect(bw?.startsAt.toISOString()).toBe("2026-11-22T23:00:00.000Z");
    expect(bw?.endsAt.toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });
});
