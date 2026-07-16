import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function collectImageFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImageFiles(fullPath, results);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Fuzzy-match a product name to a local packshot filename */
export function matchLocalImage(productName: string, imagesRoot: string): string | undefined {
  const files = collectImageFiles(imagesRoot);
  if (files.length === 0) return undefined;

  const nameTokens = tokenize(productName);
  if (nameTokens.length === 0) return undefined;

  let bestPath: string | undefined;
  let bestScore = 0;

  for (const filePath of files) {
    const base = path.basename(filePath, path.extname(filePath));
    const fileTokens = tokenize(base);
    if (fileTokens.length === 0) continue;

    const overlap = nameTokens.filter((token) =>
      fileTokens.some((fileToken) => fileToken.includes(token) || token.includes(fileToken)),
    ).length;
    const score = overlap / nameTokens.length;
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestPath = filePath;
    }
  }

  return bestPath;
}
