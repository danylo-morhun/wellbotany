#!/usr/bin/env npx tsx
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("📤 Uploading Singularis images to Vercel Blob...\n");

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error("❌ BLOB_READ_WRITE_TOKEN not set");
    process.exit(1);
  }

  const imageDir = path.join(process.cwd(), "public/supplier-images");

  // Get products with local image paths
  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      images: {
        select: { id: true, url: true }
      }
    }
  });

  let uploaded = 0;

  for (const product of products) {
    for (const img of product.images) {
      // Check if URL is local (starts with /)
      if (!img.url.startsWith("/")) continue;

      const filename = img.url.split("/").pop();
      const filepath = path.join(imageDir, filename || "");

      if (!fs.existsSync(filepath)) {
        console.log(`  ⚠️  File not found: ${filename}`);
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(filepath);
        const blobFileName = `singularis/${filename}`;

        const blob = await put(blobFileName, fileBuffer, {
          access: "public",
          token: blobToken
        });

        // Update database with blob URL
        await prisma.productImage.update({
          where: { id: img.id },
          data: { url: blob.url }
        });

        uploaded++;
        if (uploaded % 20 === 0) {
          console.log(`  ✅ Uploaded ${uploaded}...`);
        }
      } catch (e) {
        console.error(`  ❌ Failed to upload ${filename}:`, (e as any).message);
      }
    }
  }

  console.log(`\n✅ Uploaded: ${uploaded}/171`);
  console.log(`📍 Images now accessible from production`);
}

main().catch(console.error).finally(() => process.exit(0));
