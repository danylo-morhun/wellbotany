// PageSpeed Insights (lab data, mobile + desktop) for key page types →
// JSON with scores, Core Web Vitals, the LCP element and top opportunities.
//
//   npx tsx scripts/seo/pagespeed.ts [--out docs/pagespeed-YYYY-MM-DD.json] [url ...]
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const DEFAULT_URLS = [
  "https://wellbotany.pl/",
  "https://wellbotany.pl/produkt/kreatyna-300-g",
  "https://wellbotany.pl/produkt/dyspep-intercell-120-kaps",
  "https://wellbotany.pl/produkt/spirulina-pacifica-hawajska-500-mg",
  "https://wellbotany.pl/produkt/cytrynian-magnezu-cytrynian-potasu-witamina-b6",
  "https://wellbotany.pl/kategoria/magnez",
  "https://wellbotany.pl/kategoria/adaptogeny",
  "https://wellbotany.pl/katalog",
  "https://wellbotany.pl/poradnik",
  "https://wellbotany.pl/poradnik/jak-wybrac-magnez",
];

type Audit = {
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  title: string;
  details?: {
    type?: string;
    overallSavingsMs?: number;
    items?: { node?: { snippet?: string; selector?: string } }[];
  };
};

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out =
  outIdx >= 0 ? args[outIdx + 1] : `docs/pagespeed-${new Date().toISOString().slice(0, 10)}.json`;
const urls = args.filter((a, i) => a.startsWith("http") && i !== outIdx + 1);
const key = readFileSync(`${homedir()}/.config/wellbotany/google-api-key`, "utf8").trim();

async function run(url: string, strategy: "mobile" | "desktop") {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&locale=pl&key=${key}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(api);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    const body = (await res.json()) as {
      lighthouseResult: {
        categories: { performance: { score: number } };
        audits: Record<string, Audit>;
      };
    };
    const a = body.lighthouseResult.audits;
    const ms = (id: string) => Math.round(a[id]?.numericValue ?? 0);
    const lcpNode = a["largest-contentful-paint-element"]?.details?.items?.[0] as
      | { items?: { node?: { snippet?: string } }[] }
      | undefined;
    const opportunities = Object.entries(a)
      .filter(
        ([, x]) => x.details?.type === "opportunity" && (x.details.overallSavingsMs ?? 0) > 100,
      )
      .sort((x, y) => (y[1].details?.overallSavingsMs ?? 0) - (x[1].details?.overallSavingsMs ?? 0))
      .slice(0, 5)
      .map(([id, x]) => ({ id, title: x.title, savingsMs: x.details?.overallSavingsMs }));
    return {
      url,
      strategy,
      score: Math.round(body.lighthouseResult.categories.performance.score * 100),
      lcpMs: ms("largest-contentful-paint"),
      cls: Number((a["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
      tbtMs: ms("total-blocking-time"),
      fcpMs: ms("first-contentful-paint"),
      siMs: ms("speed-index"),
      ttfbMs: ms("server-response-time"),
      lcpElement: lcpNode?.items?.[0]?.node?.snippet ?? null,
      lcpBreakdown:
        a["lcp-breakdown-insight"]?.details ??
        a["largest-contentful-paint-element"]?.details?.items?.[1] ??
        null,
      opportunities,
      diagnostics: [
        "bootup-time",
        "mainthread-work-breakdown",
        "total-byte-weight",
        "unused-javascript",
        "render-blocking-resources",
        "render-blocking-insight",
      ]
        .filter((id) => a[id])
        .map((id) => ({ id, displayValue: a[id].displayValue, score: a[id].score })),
    };
  }
  return { url, strategy, error: "PSI failed 3×" };
}

async function main() {
  const list = urls.length ? urls : DEFAULT_URLS;
  const results = [];
  // Two at a time — PSI runs Lighthouse per request and throttles bursts
  const jobs = list.flatMap((u) => [
    [u, "mobile"],
    [u, "desktop"],
  ]) as [string, "mobile" | "desktop"][];
  for (let i = 0; i < jobs.length; i += 2) {
    results.push(...(await Promise.all(jobs.slice(i, i + 2).map(([u, s]) => run(u, s)))));
    console.log(`${Math.min(i + 2, jobs.length)}/${jobs.length}`);
  }
  writeFileSync(out, JSON.stringify(results, null, 1));
  console.log(`→ ${out}`);
  for (const r of results)
    if ("score" in r)
      console.log(
        `${r.strategy.padEnd(7)} ${String(r.score).padStart(3)}  LCP ${r.lcpMs}ms  CLS ${r.cls}  TBT ${r.tbtMs}ms  ${r.url.replace("https://wellbotany.pl", "")}`,
      );
}

main();
