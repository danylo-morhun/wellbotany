// Weekly Search Console check: queries/pages for the last 28 days, queries
// that are new since the previous snapshot, and index status of key URLs.
// Snapshots go to docs/gsc/<date>.json, the readable report to stdout + docs/gsc/<date>.md.
//
//   npx tsx scripts/seo/gsc-report.ts [--days 28] [--inspect url ...]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { googleToken, SCOPES } from "./google-auth";

const SITE = "https://wellbotany.pl/";
const DIR = "docs/gsc";
const KEY_URLS = [
  "/",
  "/katalog",
  "/poradnik",
  "/skladniki",
  "/faq",
  "/kategoria/magnez",
  "/kategoria/witamina-d",
  "/kategoria/probiotyki",
  "/skladniki/magnez",
  "/poradnik/jak-wybrac-magnez",
  "/poradnik/jak-wybrac-probiotyk",
  "/poradnik/witamina-d3-jak-suplementowac",
];

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

const args = process.argv.slice(2);
const daysIdx = args.indexOf("--days");
const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : 28;
const inspectIdx = args.indexOf("--inspect");
const inspect = inspectIdx >= 0 ? args.slice(inspectIdx + 1) : KEY_URLS;

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function query(token: string, dimension: "query" | "page"): Promise<Row[]> {
  const end = new Date(Date.now() - 2 * 86_400_000); // GSC lags ~2 days
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate: iso(start),
        endDate: iso(end),
        dimensions: [dimension],
        rowLimit: 1000,
      }),
    },
  );
  if (!res.ok) throw new Error(`GSC ${dimension}: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { rows?: Row[] }).rows ?? [];
}

async function inspectUrl(token: string, path: string) {
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      inspectionUrl: new URL(path, SITE).href,
      siteUrl: SITE,
      languageCode: "pl",
    }),
  });
  if (!res.ok) return { path, verdict: `error ${res.status}` };
  const r = (
    (await res.json()) as {
      inspectionResult?: {
        indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string };
      };
    }
  ).inspectionResult?.indexStatusResult;
  return {
    path,
    verdict: r?.verdict ?? "?",
    coverage: r?.coverageState ?? "",
    lastCrawl: r?.lastCrawlTime?.slice(0, 10) ?? "",
  };
}

async function main() {
  const token = await googleToken(SCOPES.searchConsole);
  const [queries, pages] = await Promise.all([query(token, "query"), query(token, "page")]);
  const index = [];
  for (const path of inspect) index.push(await inspectUrl(token, path));

  mkdirSync(DIR, { recursive: true });
  const previousFile = existsSync(DIR)
    ? readdirSync(DIR)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .pop()
    : undefined;
  const previous: Row[] = previousFile
    ? JSON.parse(readFileSync(`${DIR}/${previousFile}`, "utf8")).queries
    : [];
  const known = new Set(previous.map((r) => r.keys[0]));
  const fresh = queries
    .filter((r) => !known.has(r.keys[0]))
    .sort((a, b) => b.impressions - a.impressions);

  const today = iso(new Date());
  writeFileSync(`${DIR}/${today}.json`, JSON.stringify({ days, queries, pages, index }, null, 1));

  const fmt = (r: Row) =>
    `| ${r.keys[0].replace("https://wellbotany.pl", "")} | ${r.clicks} | ${r.impressions} | ${r.position.toFixed(1)} |`;
  const top = (rows: Row[], n: number) =>
    [...rows]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, n)
      .map(fmt)
      .join("\n");
  const md = `# GSC ${today} (ostatnie ${days} dni)

Kliknięcia: ${queries.reduce((s, r) => s + r.clicks, 0)}, wyświetlenia: ${queries.reduce((s, r) => s + r.impressions, 0)}, zapytań: ${queries.length}${previousFile ? ` (poprzedni snapshot: ${previousFile})` : ""}

## Nowe zapytania (${fresh.length})

| zapytanie | kliknięcia | wyświetlenia | pozycja |
|---|---|---|---|
${fresh.slice(0, 50).map(fmt).join("\n")}

## Top zapytania

| zapytanie | kliknięcia | wyświetlenia | pozycja |
|---|---|---|---|
${top(queries, 40)}

## Top strony

| strona | kliknięcia | wyświetlenia | pozycja |
|---|---|---|---|
${top(pages, 30)}

## Indeksacja kluczowych URL

| url | werdykt | stan | ostatni crawl |
|---|---|---|---|
${index.map((i) => `| ${i.path} | ${i.verdict} | ${"coverage" in i ? i.coverage : ""} | ${"lastCrawl" in i ? i.lastCrawl : ""} |`).join("\n")}
`;
  writeFileSync(`${DIR}/${today}.md`, md);
  console.log(md);
}

main();
