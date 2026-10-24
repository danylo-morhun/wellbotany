// Ad accounts connected to the shop. Read by the cookie banner (client) and
// the cookie / privacy policies (server), so texts name only tools that run.
export const GOOGLE_ADS_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);
export const META_ENABLED = process.env.NEXT_PUBLIC_META_ENABLED === "true";
export const MARKETING_ENABLED = GOOGLE_ADS_ENABLED || META_ENABLED;

/** "Google Ads i Meta (Facebook, Instagram)" — the tools the marketing category covers. */
export const MARKETING_TOOLS = [
  GOOGLE_ADS_ENABLED && "Google Ads",
  META_ENABLED && "Meta (Facebook, Instagram)",
]
  .filter(Boolean)
  .join(" i ");
