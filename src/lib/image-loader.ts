import type { ImageLoaderProps } from "next/image";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * next/image loader: resizes + converts (AVIF/WebP) through Cloudinary
 * instead of Vercel's optimizer (Hobby quota). Cloudinary uploads get the
 * transformation prepended; any other remote image (Vercel Blob, supplier
 * CDNs) goes through Cloudinary's fetch delivery — no re-upload needed.
 * Allowed fetch domains are restricted in the Cloudinary console.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  // Local /public assets (logos, og image) are already small or SVG
  if (src.startsWith("/")) return `${src}?w=${width}`;
  return cloudinaryUrl(src, `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`);
}

/**
 * Image URL for crawlers and feeds (Merchant Center, Open Graph, JSON-LD,
 * sitemaps). Served by Cloudinary so bots never pull originals from the
 * storage origin, and as JPEG because Merchant Center and social previews
 * reject AVIF, which f_auto may pick.
 */
export function publicImageUrl(src: string, width = 1200): string {
  if (src.startsWith("/")) return src;
  return cloudinaryUrl(src, `f_jpg,q_auto,c_limit,w_${width}`);
}

// Transformation segments already baked into a stored delivery URL
// (e.g. "f_auto,q_auto/") — dropped so ours is the only one applied.
const STORED_TRANSFORMATION = /^(?:[a-z]{1,3}_[^/,]+(?:,[a-z]{1,3}_[^/,]+)*\/)+/;

function cloudinaryUrl(src: string, transformation: string): string {
  if (!CLOUD_NAME) return src;
  const upload = src.match(CLOUDINARY_UPLOAD);
  if (upload)
    return `${upload[1]}${transformation}/${upload[2].replace(STORED_TRANSFORMATION, "")}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformation}/${encodeURIComponent(src)}`;
}
