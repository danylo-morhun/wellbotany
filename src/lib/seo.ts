export const DEFAULT_OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Well Botany — suplementy diety, witaminy i produkty bio",
};

/**
 * JSON.stringify output can contain "</script>" if a field holds that literal
 * string (e.g. supplier-imported product name/description) — escaping "<"
 * prevents it from closing the script tag early and injecting markup.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Every listing query param except `strona` — see buildCatalogUrl
const LISTING_FILTER_PARAMS = [
  "kategoria",
  "marka",
  "tagi",
  "cenaMin",
  "cenaMax",
  "szukaj",
  "promocje",
  "nowosci",
  "polecane",
  "dostepne",
  "sortuj",
];

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Indexing rules for a product listing (katalog, kategoria, marka): each
 * page of the plain listing is its own canonical (pointing page 2+ at page 1
 * tells Google to drop the products only linked from later pages); any
 * filter, sort or search combination is a near-duplicate → noindex, follow.
 */
export function buildListingSeo(path: string, searchParams: SearchParams) {
  const page = Math.max(1, Math.floor(Number(searchParams.strona)) || 1);
  const filtered = LISTING_FILTER_PARAMS.some((key) => searchParams[key] !== undefined);
  return {
    page,
    canonical: page > 1 ? `${path}?strona=${page}` : path,
    noindex: filtered,
    titleSuffix: page > 1 ? ` – strona ${page}` : "",
  };
}

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function buildOrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Well Botany",
    url: siteUrl,
    logo: `${siteUrl}/branding/logo-horizontal.svg`,
  };
}

export function buildWebsiteJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Well Botany",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/katalog?szukaj={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildFaqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

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

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type JsonLdVariant = {
  id: string;
  sku: string;
  ean: string | null;
  optionValue: string | null;
  pricePln: number;
  stock: number;
  trackStock: boolean;
  isDefault: boolean;
};

/**
 * Product structured data. One variant → a Product with one Offer; several
 * (pack sizes) → a ProductGroup with a Product + Offer + GTIN per variant,
 * each pointing at its own `?wariant=` URL — Google's merchant listings
 * need a real Offer per purchasable item, not an AggregateOffer.
 */
export function buildProductJsonLd(product: {
  name: string;
  description?: string | null;
  images: { url: string; variantId: string | null }[];
  brandName?: string | null;
  variants: JsonLdVariant[];
  slug: string;
}) {
  if (product.variants.length === 0) return null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";
  const url = `${siteUrl}/produkt/${product.slug}`;
  const description = product.description
    ? stripHtml(product.description).slice(0, 5000)
    : undefined;
  const brand = product.brandName ? { "@type": "Brand", name: product.brandName } : undefined;
  const sharedImages = product.images.filter((i) => i.variantId === null).map((i) => i.url);

  const variantProduct = (v: JsonLdVariant, variantUrl: string) => {
    const own = product.images.filter((i) => i.variantId === v.id).map((i) => i.url);
    return {
      "@type": "Product",
      name:
        v.optionValue && product.variants.length > 1
          ? `${product.name} – ${v.optionValue}`
          : product.name,
      sku: v.sku,
      ...(v.ean && { gtin: v.ean }),
      image:
        own.length > 0
          ? own
          : sharedImages.length > 0
            ? sharedImages
            : product.images.map((i) => i.url),
      offers: {
        "@type": "Offer",
        url: variantUrl,
        priceCurrency: "PLN",
        price: (v.pricePln / 100).toFixed(2),
        itemCondition: "https://schema.org/NewCondition",
        // Without stock tracking the item is orderable regardless of the count
        availability:
          !v.trackStock || v.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    };
  };

  if (product.variants.length === 1) {
    return {
      "@context": "https://schema.org",
      ...variantProduct(product.variants[0], url),
      description,
      url,
      ...(brand && { brand }),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    description,
    url,
    productGroupID: product.slug,
    variesBy: ["https://schema.org/size"],
    ...(brand && { brand }),
    hasVariant: product.variants.map((v) => ({
      ...variantProduct(v, `${url}?wariant=${v.id}`),
      ...(brand && { brand }),
    })),
  };
}
