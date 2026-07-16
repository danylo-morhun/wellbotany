import { NextResponse } from "next/server";
import { importSupplierProducts } from "@/features/products/lib/import/import-products";
import {
  buildDraftsFromStocks,
  fetchDraftsForKnownProducts,
  fetchProductsByIds,
  fetchStocksPage,
} from "@/features/products/lib/import/parsers/shoper-api";
import { SUPPLIER_SOURCES } from "@/features/products/lib/import/sources";
import type { ImportSummary } from "@/features/products/lib/import/types";
import { syncProductToBaselinker } from "@/lib/baselinker/inventory";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const SHOPER_SOURCE = SUPPLIER_SOURCES.find(
  (s) => s.kind === "api" && s.format === "shoper-api",
) as Extract<(typeof SUPPLIER_SOURCES)[number], { kind: "api"; format: "shoper-api" }>;

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/**
 * Walks error.cause chains (fetch's TypeError wraps the real cause, e.g.
 * ECONNRESET, a few levels deep) collecting messages/codes to test against.
 */
function isTransientError(error: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i++) {
    if (!(current instanceof Error)) {
      parts.push(String(current));
      break;
    }
    parts.push(current.message);
    const code = (current as NodeJS.ErrnoException).code;
    if (code) parts.push(code);
    current = current.cause;
  }
  return /closed the connection|Closed, cause: None|connection.*(reset|terminated)|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket disconnected|unable to start a transaction/i.test(
    parts.join(" | "),
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Both the Neon pooled DB connection and the Shoper API connection
 * occasionally drop mid-run when there's a gap between calls (waiting on
 * the other side between requests) — retrying a fresh operation gets a new
 * connection rather than reusing the dead one.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts || !isTransientError(error)) throw error;
      await sleep(attempt * 500);
    }
  }
  throw new Error("unreachable");
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function afterImport(summary: ImportSummary) {
  const productIds = [
    ...new Set(
      summary.rows
        .filter((r) => r.productId && (r.status === "created" || r.status === "updated"))
        .map((r) => r.productId as string),
    ),
  ];
  for (const productId of productIds) {
    void syncProductToBaselinker(productId).catch(console.error);
  }
}

async function importDraftsIsolated(
  drafts: Awaited<ReturnType<typeof buildDraftsFromStocks>>,
): Promise<ImportSummary> {
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: 0, rows: [] };

  // One transaction per draft — a single bad row (e.g. a constraint clash)
  // must not abort the whole Postgres transaction and take out every
  // sibling row queued alongside it.
  for (const draft of drafts) {
    const rowSummary = await withRetry(() =>
      prisma.$transaction((tx) =>
        importSupplierProducts(tx, [draft], {
          brandName: SHOPER_SOURCE.brandName,
          brandSlug: SHOPER_SOURCE.brandSlug,
          updateExisting: true,
        }),
      ),
    );
    summary.created += rowSummary.created;
    summary.updated += rowSummary.updated;
    summary.skipped += rowSummary.skipped;
    summary.errors += rowSummary.errors;
    summary.rows.push(...rowSummary.rows);
  }

  return summary;
}

async function runIncremental() {
  const variants = await prisma.productVariant.findMany({
    where: { shoperProductId: { not: null } },
    select: { shoperProductId: true },
  });
  const productIds = [
    ...new Set(variants.map((v) => v.shoperProductId).filter((v): v is number => v !== null)),
  ];

  const drafts = await fetchDraftsForKnownProducts(productIds, SHOPER_SOURCE);
  const summary = await importDraftsIsolated(drafts);

  await afterImport(summary);
  return { productsChecked: productIds.length, ...summary };
}

async function runDiscover() {
  const pageSize = envInt("SHOPER_STOCKS_PAGE_LIMIT", 50);
  const pagesPerRun = envInt("SHOPER_DISCOVER_PAGES_PER_RUN", 15);

  const state = await prisma.shoperSyncState.upsert({
    where: { kind: "discover" },
    create: { kind: "discover", cursorPage: 1 },
    update: {},
  });

  let page = state.cursorPage || 1;
  let totalPages = page;
  const combinedSummary: ImportSummary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    rows: [],
  };
  let pagesProcessed = 0;

  try {
    for (let i = 0; i < pagesPerRun; i++) {
      const { stocks, totalPages: pages } = await withRetry(() => fetchStocksPage(page, pageSize));
      totalPages = pages;
      pagesProcessed++;

      if (stocks.length > 0) {
        const productIds = [
          ...new Set(
            stocks
              .map((s) => (s.product_id !== undefined ? Number(s.product_id) : null))
              .filter((v): v is number => v !== null && Number.isFinite(v)),
          ),
        ];
        const productsById = await fetchProductsByIds(productIds);
        const drafts = await buildDraftsFromStocks(stocks, productsById, SHOPER_SOURCE);

        const summary = await withRetry(() => importDraftsIsolated(drafts));
        combinedSummary.created += summary.created;
        combinedSummary.updated += summary.updated;
        combinedSummary.skipped += summary.skipped;
        combinedSummary.errors += summary.errors;
        combinedSummary.rows.push(...summary.rows);
      }

      page = page >= totalPages ? 1 : page + 1;

      // Persist progress after every page — a later page failing shouldn't
      // discard work already committed, or force a full re-scan from page 1.
      await withRetry(() =>
        prisma.shoperSyncState.update({
          where: { kind: "discover" },
          data: { cursorPage: page, lastRunAt: new Date() },
        }),
      );

      if (totalPages <= 1) break;
    }

    await prisma.shoperSyncState.update({
      where: { kind: "discover" },
      data: { lastSuccessAt: new Date(), lastError: null },
    });
  } catch (error) {
    await prisma.shoperSyncState
      .update({
        where: { kind: "discover" },
        data: {
          lastRunAt: new Date(),
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .catch(() => {});
    throw error;
  }

  await afterImport(combinedSummary);
  return { pagesProcessed, resumeAtPage: page, totalPages, ...combinedSummary };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const mode = new URL(req.url).searchParams.get("mode");
  if (mode !== "incremental" && mode !== "discover") {
    return NextResponse.json(
      { ok: false, error: "mode must be 'incremental' or 'discover'" },
      { status: 400 },
    );
  }

  try {
    const result = mode === "incremental" ? await runIncremental() : await runDiscover();
    return NextResponse.json({ ok: true, mode, result });
  } catch (error) {
    console.error(`[shoper-sync:${mode}]`, error);
    return NextResponse.json(
      { ok: false, mode, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
