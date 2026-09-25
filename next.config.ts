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
  // Dynamic pages (katalog, kategoria) otherwise stream <title>, description
  // and canonical into <body> for every client not on Next's bot list —
  // Bing and SEO tools included. Their metadata is cached data, so waiting
  // for it costs nothing noticeable.
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  images: {
    // Resized/converted by Cloudinary (src/lib/image-loader.ts), not Vercel's
    // optimizer — its Hobby-plan source-image quota ran out on supplier photos.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Fewer srcset widths → fewer Cloudinary derivatives (free-tier credits)
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [96, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "dcu4fybzavbhk0mv.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.baselinker.com" },
      { protocol: "https", hostname: "zielarniakaliska.com.pl" },
      // kenay.com.pl: ~43 products still point here — their catalog pages 404'd
      // before the Blob migration could fetch them, so the old (dead) URL is
      // still in the DB. Keep allowed until those are fixed manually.
      { protocol: "https", hostname: "kenay.com.pl" },
    ],
  },
  async redirects() {
    return [{ source: "/sitemap.xml", destination: "/sitemap_index.xml", permanent: true }];
  },
  async headers() {
    // Next dev's Fast Refresh relies on eval() and an HMR websocket that a
    // strict CSP would break — only enforce these headers in production.
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
