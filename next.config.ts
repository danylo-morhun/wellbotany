import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.baselinker.com" },
      { protocol: "https", hostname: "zielarniakaliska.com.pl" },
      { protocol: "https", hostname: "yango.pl" },
      { protocol: "https", hostname: "kenay.com.pl" },
    ],
  },
};

export default nextConfig;
