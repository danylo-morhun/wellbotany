import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://twojezdrowie.pl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/konto", "/api", "/zamowienie", "/koszyk"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
