/**
 * JSON.stringify output can contain "</script>" if a field holds that literal
 * string (e.g. supplier-imported product name/description) — escaping "<"
 * prevents it from closing the script tag early and injecting markup.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href,
    })),
  };
}

export function buildProductJsonLd(product: {
  name: string;
  description?: string | null;
  images: string[];
  brandName?: string | null;
  variants: Array<{ pricePln: number; stock: number }>;
  slug: string;
}) {
  const prices = product.variants.map((v) => v.pricePln);
  const inStock = product.variants.some((v) => v.stock > 0);
  if (prices.length === 0) return null;
  const lowPrice = Math.min(...prices) / 100;
  const highPrice = Math.max(...prices) / 100;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://twojezdrowie.pl";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    url: `${siteUrl}/produkt/${product.slug}`,
    ...(product.brandName && {
      brand: { "@type": "Brand", name: product.brandName },
    }),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PLN",
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}
