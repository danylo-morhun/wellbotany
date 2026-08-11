import { afterEach, describe, expect, it, vi } from "vitest";

// Drafts all carry imageUrl so enrichWithLocalImages' per-product local-image
// matching (which would otherwise hit the real fs.readdirSync) short-circuits.
const { parseYangoCsv, parseKenayXlsx, parsePureHydrationXlsx, parseShoperApi } = vi.hoisted(
  () => ({
    parseYangoCsv: vi.fn(() => [
      { name: "Yango product", imageUrl: "https://example.com/yango.jpg" },
    ]),
    parseKenayXlsx: vi.fn(() => [
      { name: "Kenay product", imageUrl: "https://example.com/kenay.jpg" },
    ]),
    parsePureHydrationXlsx: vi.fn(() => [
      { name: "Pure Hydration product", imageUrl: "https://example.com/pure.jpg" },
    ]),
    parseShoperApi: vi.fn(async () => [
      { name: "Shoper product", imageUrl: "https://example.com/shoper.jpg" },
    ]),
  }),
);

vi.mock("@/features/products/lib/import/parsers/yango-csv", () => ({ parseYangoCsv }));
vi.mock("@/features/products/lib/import/parsers/kenay-xlsx", () => ({ parseKenayXlsx }));
vi.mock("@/features/products/lib/import/parsers/pure-hydration-xlsx", () => ({
  parsePureHydrationXlsx,
}));
vi.mock("@/features/products/lib/import/parsers/shoper-api", () => ({ parseShoperApi }));
// Only fs.existsSync is used by parse-supplier-file.ts (source-file presence
// check + local-images-dir presence check) — stub it so the dispatch test
// doesn't depend on real files. Mock drafts all set imageUrl, so the
// local-image-matching path is skipped even though existsSync says "true".
vi.mock("node:fs", () => ({ default: { existsSync: () => true }, existsSync: () => true }));

import {
  loadSupplierProducts,
  parseSupplierFile,
} from "@/features/products/lib/import/parse-supplier-file";
import type { SupplierSource } from "@/features/products/lib/import/sources";

afterEach(() => {
  vi.clearAllMocks();
});

function fileSource(overrides: Partial<SupplierSource & { kind: "file" }>): SupplierSource {
  return {
    kind: "file",
    id: "test",
    label: "Test",
    brandName: "Test",
    brandSlug: "test",
    filePath: "irrelevant.dat",
    format: "yango-csv",
    defaultVatRate: 23,
    ...overrides,
  } as SupplierSource;
}

describe("parseSupplierFile — dispatch by source.format", () => {
  it("calls parseYangoCsv for yango-csv sources", () => {
    const source = fileSource({ format: "yango-csv" });
    parseSupplierFile(source);
    expect(parseYangoCsv).toHaveBeenCalledTimes(1);
    expect(parseKenayXlsx).not.toHaveBeenCalled();
    expect(parsePureHydrationXlsx).not.toHaveBeenCalled();
  });

  it("calls parseKenayXlsx for kenay-xlsx sources", () => {
    const source = fileSource({ format: "kenay-xlsx" });
    parseSupplierFile(source);
    expect(parseKenayXlsx).toHaveBeenCalledTimes(1);
    expect(parseYangoCsv).not.toHaveBeenCalled();
    expect(parsePureHydrationXlsx).not.toHaveBeenCalled();
  });

  it("calls parsePureHydrationXlsx for pure-hydration-xlsx sources", () => {
    const source = fileSource({ format: "pure-hydration-xlsx" });
    parseSupplierFile(source);
    expect(parsePureHydrationXlsx).toHaveBeenCalledTimes(1);
    expect(parseYangoCsv).not.toHaveBeenCalled();
    expect(parseKenayXlsx).not.toHaveBeenCalled();
  });

  it("rejects an api-kind source — file parsing requires a file source", async () => {
    const apiSource: SupplierSource = {
      kind: "api",
      id: "shoper",
      label: "Shoper",
      brandName: "Shoper",
      brandSlug: "shoper",
      format: "shoper-api",
      defaultVatRate: 23,
    };
    await expect(parseSupplierFile(apiSource)).rejects.toThrow(/nie używa pliku/i);
  });
});

describe("loadSupplierProducts — api sources", () => {
  it("calls parseShoperApi for the shoper-api source", async () => {
    const source: SupplierSource = {
      kind: "api",
      id: "shoper",
      label: "Shoper",
      brandName: "Shoper",
      brandSlug: "shoper",
      format: "shoper-api",
      defaultVatRate: 23,
    };
    const result = await loadSupplierProducts(source);
    expect(parseShoperApi).toHaveBeenCalledWith(source);
    expect(result).toEqual([
      { name: "Shoper product", imageUrl: "https://example.com/shoper.jpg" },
    ]);
  });

  it("delegates to parseSupplierFile for file sources", async () => {
    const source = fileSource({ format: "kenay-xlsx" });
    const result = await loadSupplierProducts(source);
    expect(parseKenayXlsx).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ name: "Kenay product", imageUrl: "https://example.com/kenay.jpg" }]);
  });
});
