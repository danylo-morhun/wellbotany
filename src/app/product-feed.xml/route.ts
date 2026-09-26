// Google Merchant Center product feed (RSS 2.0 + g: namespace).
// Register this URL as a "Scheduled fetch" content source in Merchant Center.
import { NextResponse } from "next/server";
import { resolveDisplayBrand } from "@/features/catalog/lib/brand-tree";
import { MAIN_IMAGE_FIRST } from "@/features/catalog/lib/main-image";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/seo";
import { feedUnitPricing, variantPackQuantity } from "@/lib/unit-price";

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

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      netWeight: true,
      brand: {
        select: { name: true, slug: true, parentBrand: { select: { name: true, slug: true } } },
      },
      images: {
        select: { url: true },
        orderBy: MAIN_IMAGE_FIRST,
        take: 1,
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          ean: true,
          optionValue: true,
          pricePln: true,
          stock: true,
          trackStock: true,
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

    const multiVariant = product.variants.length > 1;
    return product.variants.map((variant) => {
      const name =
        variant.optionValue && !product.namePl.endsWith(variant.optionValue)
          ? `${product.namePl} – ${variant.optionValue}`
          : product.namePl;
      // Brand first, as Google recommends for Shopping titles (names carry no brand)
      const title =
        displayBrand && !name.toLowerCase().includes(displayBrand.name.toLowerCase())
          ? `${displayBrand.name} ${name}`
          : name;
      // Each variant's own URL, so the landing page shows the feed price
      const variantLink = multiVariant ? `${link}?wariant=${variant.id}` : link;
      const inStock = !variant.trackStock || variant.stock > 0;
      const unitPricing = feedUnitPricing(
        variantPackQuantity(variant.optionValue, product.netWeight, !multiVariant, product.namePl),
      );

      return `    <item>
      <g:id>${escapeXml(variant.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(variantLink)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${(variant.pricePln / 100).toFixed(2)} PLN</g:price>
      <g:condition>new</g:condition>
      ${unitPricing ? `<g:unit_pricing_measure>${unitPricing.measure}</g:unit_pricing_measure>\n      <g:unit_pricing_base_measure>${unitPricing.base}</g:unit_pricing_base_measure>` : ""}
      ${multiVariant ? `<g:item_group_id>${escapeXml(product.id)}</g:item_group_id>` : ""}
      ${variant.ean ? `<g:gtin>${escapeXml(variant.ean)}</g:gtin>` : "<g:identifier_exists>no</g:identifier_exists>"}
      ${displayBrand ? `<g:brand>${escapeXml(displayBrand.name)}</g:brand>` : ""}
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
