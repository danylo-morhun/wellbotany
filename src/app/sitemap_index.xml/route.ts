// Sitemap index for the per-type sitemaps (see ../sitemap.ts, served at
// /sitemap/<id>.xml). Next can't serve both generateSitemaps and a route at
// /sitemap.xml, so that URL (already in Search Console) redirects here.
import { SITEMAP_IDS } from "../sitemap";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

export const dynamic = "force-static";

export function GET() {
  const entries = SITEMAP_IDS.map(
    (id) => `  <sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`,
  ).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
