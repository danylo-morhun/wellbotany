// Google Merchant Center product feed (RSS 2.0 + g: namespace).
// Register this URL as a "Scheduled fetch" content source in Merchant Center.
import { NextResponse } from "next/server";
import { resolveDisplayBrand } from "@/features/catalog/lib/brand-tree";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      brand: {
        select: { name: true, slug: true, parentBrand: { select: { name: true, slug: true } } },
      },
      images: { where: { isMain: true }, select: { url: true }, take: 1 },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          ean: true,
          optionValue: true,
          pricePln: true,
          stock: true,
        },
      },
    },
  });

  const items = products.flatMap((product) => {
    const image = product.images[0]?.url;
    if (!image) return [];

    const rawDescription = product.shortDescPl ?? product.descriptionPl ?? product.namePl;
    const description = stripHtml(rawDescription).slice(0, 5000);
    const link = `${SITE_URL}/produkt/${product.slug}`;
    const displayBrand = product.brand ? resolveDisplayBrand(product.brand) : null;

    return product.variants.map((variant) => {
      const title =
        variant.optionValue && !product.namePl.endsWith(variant.optionValue)
          ? `${product.namePl} – ${variant.optionValue}`
          : product.namePl;

      return `    <item>
      <g:id>${escapeXml(variant.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${variant.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${(variant.pricePln / 100).toFixed(2)} PLN</g:price>
      <g:condition>new</g:condition>
      <g:item_group_id>${escapeXml(product.slug)}</g:item_group_id>
      <g:mpn>${escapeXml(variant.sku)}</g:mpn>
      ${variant.ean ? `<g:gtin>${escapeXml(variant.ean)}</g:gtin>` : ""}
      ${displayBrand ? `<g:brand>${escapeXml(displayBrand.name)}</g:brand>` : "<g:identifier_exists>no</g:identifier_exists>"}
    </item>`;
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Well Botany — katalog produktów</title>
    <link>${SITE_URL}</link>
    <description>Feed produktowy Well Botany dla Google Merchant Center</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
