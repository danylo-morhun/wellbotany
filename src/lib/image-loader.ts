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
  if (!CLOUD_NAME) return src;

  const transformation = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
  const upload = src.match(CLOUDINARY_UPLOAD);
  if (upload) return `${upload[1]}${transformation}/${upload[2]}`;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformation}/${encodeURIComponent(src)}`;
}
