// Reads name-pass results and applies manual review overrides
// (data/content-pass/names-overrides.json: { [productId]: Partial<after> &
// { status?: "approved" | "rejected" } }). An override without a status
// approves the item.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(__dirname, "../../../data/content-pass/names");
const OVERRIDES = path.join(__dirname, "../../../data/content-pass/names-overrides.json");

export type NameResult = {
  id: string;
  slug: string;
  status: string;
  before: {
    namePl: string;
    metaTitlePl: string | null;
    metaDescPl: string | null;
    categories: string[];
  };
  after: {
    namePl: string;
    metaTitlePl: string;
    metaDescPl: string;
    primaryCategory: string;
    extraCategories: string[];
  } | null;
  problems?: { field: string; type: string; text: string }[];
  secondOpinion?: string;
};

export function loadNameResults(): NameResult[] {
  const overrides: Record<string, Record<string, unknown>> = fs.existsSync(OVERRIDES)
    ? JSON.parse(fs.readFileSync(OVERRIDES, "utf8"))
    : {};
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const r = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as NameResult;
      const o = overrides[r.id];
      if (!o) return r;
      const { status, ...after } = o;
      return {
        ...r,
        status: typeof status === "string" ? status : "approved",
        after: { ...(r.after as NonNullable<NameResult["after"]>), ...after },
      };
    });
}
