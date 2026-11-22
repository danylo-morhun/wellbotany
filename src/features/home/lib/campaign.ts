/**
 * Dated sales campaigns shown as their own homepage section. Its products are
 * the real reductions of the moment (lib/omnibus: price below the 30-day low),
 * so a campaign needs no product list here — prices set in the admin decide.
 *
 * Times are Polish local time. `endsAt` is exclusive: the first moment the
 * campaign is over.
 */
export type Campaign = {
  id: string;
  title: string;
  /** Shown under the heading: the real end, never a countdown */
  note: string;
  startsAt: Date;
  endsAt: Date;
  /** Opening band while the campaign runs: poster words and lead. Counts in the
   * lead must stay true for the whole window (round down). */
  hero?: { poster: [string, string]; lead: string };
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: "black-week-2026",
    title: "Black Week",
    note: "Obniżki do poniedziałku 30.11, godz. 23:59",
    startsAt: new Date("2026-11-23T00:00:00+01:00"),
    endsAt: new Date("2026-12-01T00:00:00+01:00"),
    hero: {
      poster: ["Black", "Week"],
      lead: "Ponad 800 produktów taniej do poniedziałku 30.11, godz. 23:59. Przy każdym cena sprzed obniżki i najniższa z 30 dni.",
    },
  },
  {
    id: "swieta-2026",
    title: "Na Święta",
    // Last day to order and pay for delivery before Christmas (marketing plan R6)
    note: "Obniżki do środy 16.12, godz. 23:59",
    startsAt: new Date("2026-12-07T00:00:00+01:00"),
    endsAt: new Date("2026-12-17T00:00:00+01:00"),
  },
];

/** The home page is cached for up to an hour, so the server already renders a
 * campaign this long before it starts; the client hides it until then. */
export const CAMPAIGN_RENDER_LEAD_MS = 60 * 60 * 1000;

export function isCampaignLive(campaign: Pick<Campaign, "startsAt" | "endsAt">, now: Date) {
  return campaign.startsAt <= now && now < campaign.endsAt;
}

/** Campaign the server should render now: live, or starting within the lead. */
export function campaignToRender(now = new Date(), campaigns = CAMPAIGNS): Campaign | null {
  return (
    campaigns.find(
      (c) => c.startsAt.getTime() - CAMPAIGN_RENDER_LEAD_MS <= now.getTime() && now < c.endsAt,
    ) ?? null
  );
}
