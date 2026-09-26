// Merchant Center item issues → CSVs for the owner: products whose photo is
// too small, and products disapproved under Google policies (appeal or drop
// from the feed). Also prints a count of every issue code.
//
//   DATABASE_URL=<dev> npx tsx scripts/seo/merchant-issues.ts [--prod]
import { writeFileSync } from "node:fs";
import { connect } from "../content-pass/db";
import { googleToken, MERCHANT_ACCOUNT, merchantFetch, SCOPES } from "./google-auth";

const SITE = "https://wellbotany.pl";
const SMALL_PHOTOS_CSV = "docs/mc-male-zdjecia.csv";
const DISAPPROVED_CSV = "docs/mc-odrzucone.csv";

type Issue = {
  code: string;
  severity: string;
  reportingContext?: string;
  attribute?: string;
  description?: string;
  detail?: string;
  documentation?: string;
};
type McProduct = {
  offerId: string;
  productAttributes?: { title?: string; imageLink?: string };
  productStatus?: {
    itemLevelIssues?: Issue[];
    destinationStatuses?: { reportingContext: string; disapprovedCountries?: string[] }[];
  };
};

const CONTEXT_LABELS: Record<string, string> = {
  FREE_LISTINGS: "bezpłatne informacje",
  SHOPPING_ADS: "reklamy produktowe",
  DEMAND_GEN_ADS: "Demand Gen",
  DEMAND_GEN_ADS_DISCOVER_SURFACE: "Demand Gen (Discover)",
  VIDEO_ADS: "reklamy wideo",
};
// Clears by itself once Google finishes the review
const TRANSIENT = new Set(["attribute_pending_review"]);

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const row = (values: unknown[]) => values.map(csv).join(",");

/** Width × height from the first bytes of a PNG / JPEG / WebP. */
function imageSize(buf: Buffer): [number, number] | null {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (chunk === "VP8X") return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const length = buf.readUInt16BE(i + 2);
      // SOF0–SOF15 except DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + length;
    }
  }
  return null;
}

async function describeImage(url: string | undefined): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    const size = imageSize(Buffer.from(await res.arrayBuffer()));
    return size ? `${size[0]}×${size[1]}` : "?";
  } catch {
    return "błąd pobrania";
  }
}

async function main() {
  const prisma = connect();
  const token = await googleToken(SCOPES.merchant);
  const products: McProduct[] = [];
  let pageToken = "";
  do {
    const page = (await merchantFetch(
      token,
      `products/v1/accounts/${MERCHANT_ACCOUNT}/products?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`,
    )) as { products?: McProduct[]; nextPageToken?: string };
    products.push(...(page.products ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: products.map((p) => p.offerId) } },
    select: {
      id: true,
      optionValue: true,
      product: {
        select: { id: true, slug: true, namePl: true, brand: { select: { name: true } } },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  // One entry per offer + code (Google repeats each issue per reporting context)
  const codeCounts = new Map<string, Set<string>>();
  const smallPhotos: McProduct[] = [];
  // product id → where it is disapproved and why
  const disapproved = new Map<
    string,
    { offer: McProduct; contexts: Set<string>; reasons: Map<string, Issue>; variants: number }
  >();
  for (const p of products) {
    const seen = new Set<string>();
    for (const issue of p.productStatus?.itemLevelIssues ?? []) {
      const key = `${issue.code}|${issue.severity}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!codeCounts.has(key)) codeCounts.set(key, new Set());
      codeCounts.get(key)?.add(p.offerId);
      if (issue.code.startsWith("image_too_small") && !smallPhotos.includes(p)) smallPhotos.push(p);
    }
    const contexts = (p.productStatus?.destinationStatuses ?? [])
      .filter((d) => d.disapprovedCountries?.includes("PL"))
      .map((d) => CONTEXT_LABELS[d.reportingContext] ?? d.reportingContext);
    const reasons = (p.productStatus?.itemLevelIssues ?? []).filter(
      (i) => i.severity === "DISAPPROVED" && !TRANSIENT.has(i.code),
    );
    if (contexts.length === 0 || reasons.length === 0) continue;
    const key = byId.get(p.offerId)?.product.id ?? p.offerId;
    const entry = disapproved.get(key) ?? {
      offer: p,
      contexts: new Set(),
      reasons: new Map(),
      variants: 0,
    };
    entry.variants++;
    for (const c of contexts) entry.contexts.add(c);
    for (const r of reasons) entry.reasons.set(r.code, r);
    disapproved.set(key, entry);
  }

  const info = (p: McProduct) => {
    const v = byId.get(p.offerId);
    return v
      ? [
          [v.product.brand?.name, v.product.namePl].filter(Boolean).join(" "),
          v.optionValue,
          `${SITE}/produkt/${v.product.slug}`,
          `${SITE}/admin/produkty/${v.product.id}`,
        ]
      : [p.productAttributes?.title ?? `(brak w bazie: ${p.offerId})`, "", "", ""];
  };

  // Same photo is shared by all variants of a product — list each product once
  const photoRows = new Map<string, unknown[]>();
  for (const p of smallPhotos) {
    const [name, , shop, admin] = info(p);
    const key = String(admin || p.offerId);
    if (photoRows.has(key)) continue;
    const url = p.productAttributes?.imageLink;
    photoRows.set(key, [name, shop, admin, url, await describeImage(url)]);
  }
  writeFileSync(
    SMALL_PHOTOS_CSV,
    `${row(["produkt", "sklep", "admin", "zdjęcie (URL)", "rozmiar px"])}\n${[...photoRows.values()].map(row).join("\n")}\n`,
  );

  // Free listings / Shopping first — those are what the owner cares about
  const disapprovedRows = [...disapproved.values()].sort(
    (a, b) =>
      Number(b.contexts.has(CONTEXT_LABELS.FREE_LISTINGS)) -
      Number(a.contexts.has(CONTEXT_LABELS.FREE_LISTINGS)),
  );
  writeFileSync(
    DISAPPROVED_CSV,
    `${row(["produkt", "sklep", "admin", "wariantów", "odrzucony w", "kody", "powody", "dokumentacja"])}\n${disapprovedRows
      .map(({ offer, contexts, reasons, variants }) => {
        const [name, , shop, admin] = info(offer);
        const list = [...reasons.values()];
        return row([
          name,
          shop,
          admin,
          variants,
          [...contexts].join("; "),
          list.map((r) => r.code).join("; "),
          [...new Set(list.map((r) => r.description))].join("; "),
          [...new Set(list.map((r) => r.documentation))].join(" "),
        ]);
      })
      .join("\n")}\n`,
  );

  console.log(`${products.length} offers in Merchant Center`);
  for (const [key, offers] of [...codeCounts].sort((a, b) => b[1].size - a[1].size))
    console.log(`${String(offers.size).padStart(5)}  ${key}`);
  console.log(
    `→ ${SMALL_PHOTOS_CSV} (${photoRows.size} products), ${DISAPPROVED_CSV} (${disapproved.size} products)`,
  );
  await prisma.$disconnect();
}

main();
