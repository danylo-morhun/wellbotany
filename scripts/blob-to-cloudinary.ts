// Rewrites Vercel Blob image URLs in the DB to their Cloudinary copies.
// The files were already uploaded (2026-10-29); the map lives in the private repo:
//   node --env-file=.env.prod node_modules/tsx/dist/cli.mjs scripts/blob-to-cloudinary.ts \
//     ../internal/docs/catalog/blob-to-cloudinary-2026-10-29.json [--apply]
// Dry run by default. Covers every String column of every model with an `id`
// (plain URL fields and HTML/text that embeds them). Json columns are not
// scanned — check them with SQL first. With --apply, old values go to
// blob-to-cloudinary-backup-<timestamp>.json next to the map, then the live
// site's caches are expired.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshSite } from "./lib/refresh-site";

const BLOB_HOST = "blob.vercel-storage.com";

const mapPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!mapPath) throw new Error("usage: blob-to-cloudinary.ts <map.json> [--apply]");
const apply = process.argv.includes("--apply");
const urlMap: Record<string, string> = JSON.parse(readFileSync(mapPath, "utf8"));

// Longest first, so a URL that prefixes another one never replaces part of it
const oldUrls = Object.keys(urlMap).sort((a, b) => b.length - a.length);

function rewrite(value: string): { value: string; missing: string[] } {
  let out = value;
  for (const url of oldUrls) {
    if (out.includes(url)) out = out.replaceAll(url, urlMap[url]);
  }
  const missing = out.match(/https:\/\/[^\s"'()<>]*blob\.vercel-storage\.com[^\s"'()<>]*/g) ?? [];
  return { value: out, missing };
}

type Change = { model: string; id: string; field: string; old: string; new: string };
const changes: Change[] = [];
const missing: { model: string; id: string; field: string; url: string }[] = [];

for (const model of Prisma.dmmf.datamodel.models) {
  if (!model.fields.some((f) => f.name === "id")) continue;
  const fields = model.fields.filter((f) => f.kind === "scalar" && f.type === "String");
  // biome-ignore lint/suspicious/noExplicitAny: model delegates are picked by name at runtime
  const delegate = (prisma as any)[model.name[0].toLowerCase() + model.name.slice(1)];

  for (const field of fields) {
    const rows: Record<string, string>[] = await delegate.findMany({
      where: { [field.name]: { contains: BLOB_HOST } },
      select: { id: true, [field.name]: true },
    });
    for (const row of rows) {
      const result = rewrite(row[field.name]);
      for (const url of result.missing)
        missing.push({ model: model.name, id: row.id, field: field.name, url });
      if (result.value !== row[field.name]) {
        changes.push({
          model: model.name,
          id: row.id,
          field: field.name,
          old: row[field.name],
          new: result.value,
        });
      }
    }
  }
}

const perField = new Map<string, number>();
for (const c of changes)
  perField.set(`${c.model}.${c.field}`, (perField.get(`${c.model}.${c.field}`) ?? 0) + 1);
console.table(Object.fromEntries(perField));
console.log(
  `${changes.length} values to rewrite, ${missing.length} Blob URLs without a Cloudinary copy`,
);
for (const m of missing) console.log("MISSING", m.model, m.id, m.field, m.url);

if (apply) {
  const backup = join(dirname(mapPath), `blob-to-cloudinary-backup-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(changes, null, 1));
  console.log(`backup → ${backup}`);
  for (const c of changes) {
    const key = c.model[0].toLowerCase() + c.model.slice(1);
    // biome-ignore lint/suspicious/noExplicitAny: see above
    await (prisma as any)[key].update({ where: { id: c.id }, data: { [c.field]: c.new } });
  }
  console.log(`rewrote ${changes.length} values`);
  // Cached pages and the product feed still carry the old URLs until expired
  await refreshSite({ merchant: false });
} else {
  console.log("dry run — pass --apply to write");
}

await prisma.$disconnect();
