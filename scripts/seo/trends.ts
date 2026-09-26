// Google Trends (unofficial web API) for Poland, 5 years: relative interest of
// cluster head terms and their seasonality. Each request compares up to 4
// terms plus the anchor ("magnez"), so all numbers share one scale:
// interest 100 = as popular as "magnez" on average.
//
//   npx tsx scripts/seo/trends.ts [--out docs/trends.json] [term ...]
import { writeFileSync } from "node:fs";

const ANCHOR = "magnez";
const DEFAULT_TERMS = [
  "melatonina",
  "witamina d",
  "cynk",
  "witamina c",
  "kolagen",
  "glukozamina",
  "probiotyk",
  "maślan sodu",
  "biotyna",
  "koenzym q10",
  "ashwagandha",
  "omega 3",
  "witamina k2",
  "kwas foliowy",
  "inozytol",
  "berberyna",
  "lion's mane",
  "reishi",
  "kurkumina",
  "żelazo",
  "witamina b12",
  "spirulina",
  "chlorella",
  "elektrolity",
  "kreatyna",
  "tran",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36";
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : "docs/trends.json";
const terms = args.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Responses start with an anti-JSON-hijacking prefix ")]}'"
const parse = (text: string) => JSON.parse(text.slice(text.indexOf("{")));

let cookie = "";
async function get(url: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA, cookie } });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    if (res.ok) return res.text();
    await sleep(5000 * (attempt + 1));
  }
  throw new Error(`Trends failed: ${url.slice(0, 120)}`);
}

async function compare(group: string[]) {
  const req = {
    comparisonItem: group.map((keyword) => ({ keyword, geo: "PL", time: "today 5-y" })),
    category: 0,
    property: "",
  };
  const explore = parse(
    await get(
      `https://trends.google.com/trends/api/explore?hl=pl&tz=-120&req=${encodeURIComponent(JSON.stringify(req))}`,
    ),
  ) as { widgets: { id: string; token: string; request: unknown }[] };
  const widget = explore.widgets.find((w) => w.id === "TIMESERIES");
  if (!widget) throw new Error("no TIMESERIES widget");
  await sleep(1500);
  const data = parse(
    await get(
      `https://trends.google.com/trends/api/widgetdata/multiline?hl=pl&tz=-120&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`,
    ),
  ) as { default: { timelineData: { time: string; value: number[] }[] } };
  return data.default.timelineData;
}

async function main() {
  await get("https://trends.google.com/trends/?geo=PL");
  const list = terms.length ? terms : DEFAULT_TERMS;
  const result: Record<string, { interest: number; byMonth: number[]; peakMonths: number[] }> = {};
  for (let i = 0; i < list.length; i += 4) {
    const group = [ANCHOR, ...list.slice(i, i + 4)];
    const timeline = await compare(group);
    const anchorAvg = timeline.reduce((s, t) => s + t.value[0], 0) / timeline.length || 1;
    group.forEach((term, k) => {
      if (term === ANCHOR && i > 0) return;
      const sums = Array(12).fill(0);
      const counts = Array(12).fill(0);
      for (const t of timeline) {
        const month = new Date(Number(t.time) * 1000).getUTCMonth();
        sums[month] += t.value[k];
        counts[month]++;
      }
      const byMonth = sums.map((s, m) => s / (counts[m] || 1));
      const avg = byMonth.reduce((a, b) => a + b, 0) / 12 || 1;
      // Seasonality index: month average / yearly average (1.0 = typical)
      const index = byMonth.map((v) => Number((v / avg).toFixed(2)));
      result[term] = {
        interest: Math.round((avg / anchorAvg) * 100),
        byMonth: index,
        peakMonths: index
          .map((v, m) => [v, m + 1] as const)
          .filter(([v]) => v >= 1.15)
          .map(([, m]) => m),
      };
    });
    console.log(`${Math.min(i + 4, list.length)}/${list.length}`);
    await sleep(4000);
  }
  writeFileSync(out, JSON.stringify(result, null, 1));
  const rows = Object.entries(result).sort((a, b) => b[1].interest - a[1].interest);
  for (const [term, r] of rows)
    console.log(
      `${term.padEnd(16)} ${String(r.interest).padStart(4)}  szczyt: ${r.peakMonths.join(",") || "—"}`,
    );
}

main();
