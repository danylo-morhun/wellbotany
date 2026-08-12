import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in src/proxy.ts instead of here —
// it needs a fresh nonce per request for Next's inline hydration scripts,
// which a static header (as next.config.ts headers() only supports) can't provide.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    // Vercel's optimizer 402s once its Hobby-plan source-image quota is
    // exhausted — most product images come from external supplier CDNs, so
    // that quota fills fast. Unoptimized serves the source URL directly
    // (no resize/format conversion) until the plan moves to Pro.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.baselinker.com" },
      { protocol: "https", hostname: "zielarniakaliska.com.pl" },
      { protocol: "https", hostname: "yango.pl" },
      { protocol: "https", hostname: "kenay.com.pl" },
      { protocol: "https", hostname: "bestlab.com.pl" },
      { protocol: "https", hostname: "www.mito-pharma.pl" },
      { protocol: "https", hostname: "formeds.pl" },
      { protocol: "https", hostname: "azcdn.doz.pl" },
      { protocol: "https", hostname: "image.ceneostatic.pl" },
      { protocol: "https", hostname: "medpak.com.pl" },
    ],
  },
  async headers() {
    // Next dev's Fast Refresh relies on eval() and an HMR websocket that a
    // strict CSP would break — only enforce these headers in production.
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
