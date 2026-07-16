import fs from "node:fs";
import path from "node:path";
import { matchLocalImage } from "./match-local-image";
import { parseKenayXlsx } from "./parsers/kenay-xlsx";
import { parsePureHydrationXlsx } from "./parsers/pure-hydration-xlsx";
import { parseShoperApi } from "./parsers/shoper-api";
import { parseYangoCsv } from "./parsers/yango-csv";
import type { SupplierSource } from "./sources";
import { SUPPLIER_IMAGES_DIR } from "./sources";
import type { SupplierProductDraft } from "./types";

function resolveProjectPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

function enrichWithLocalImages(
  products: SupplierProductDraft[],
  imagesRoot: string,
): SupplierProductDraft[] {
  if (!fs.existsSync(imagesRoot)) return products;

  return products.map((product) => {
    if (product.imageUrl || product.localImagePath) return product;
    const localImagePath = matchLocalImage(product.name, imagesRoot);
    return localImagePath ? { ...product, localImagePath } : product;
  });
}

export function parseSupplierFile(
  source: SupplierSource,
  filePath?: string,
): SupplierProductDraft[] {
  if (source.kind !== "file") {
    throw new Error("To źródło nie używa pliku");
  }
  const absolutePath = resolveProjectPath(filePath ?? source.filePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Plik nie istnieje: ${absolutePath}`);

  let products: SupplierProductDraft[];
  switch (source.format) {
    case "yango-csv":
      products = parseYangoCsv(absolutePath, source);
      break;
    case "kenay-xlsx":
      products = parseKenayXlsx(absolutePath, source);
      break;
    case "pure-hydration-xlsx":
      products = parsePureHydrationXlsx(absolutePath, source);
      break;
    default:
      throw new Error(`Nieobsługiwany format: ${source.format satisfies never}`);
  }

  const imagesRoot = resolveProjectPath(SUPPLIER_IMAGES_DIR);
  return enrichWithLocalImages(products, imagesRoot);
}

export function sourceFileExists(source: SupplierSource): boolean {
  if (source.kind === "api") {
    // Shoper source is "available" when env is set.
    return Boolean(process.env.SHOPER_API_BASE_URL && process.env.SHOPER_API_TOKEN);
  }
  return fs.existsSync(resolveProjectPath(source.filePath));
}

export async function loadSupplierProducts(
  source: SupplierSource,
): Promise<SupplierProductDraft[]> {
  if (source.kind === "api") {
    if (source.format === "shoper-api") {
      return parseShoperApi(source);
    }
    throw new Error(`Nieobsługiwany format API: ${source.format satisfies never}`);
  }
  return parseSupplierFile(source);
}
