"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { BrandItem, CategoryItem, TagItem } from "../actions";
import { SearchInput } from "./SearchInput";

type Props = {
  categories: CategoryItem[];
  brands: BrandItem[];
  tags: TagItem[];
  basePath?: string;
  /** Category implied by the current route (e.g. `/kategoria/sport`) but not present in the URL's query string — shown as checked, and included when toggling other categories. */
  impliedCategory?: string;
  /** Brand implied by the current route (e.g. `/marki/bicaps`) but not present in the URL's query string — shown as checked, and included when toggling other brands. */
  impliedBrand?: string;
  onFilterChange?: () => void;
};

/** Stable partition, not a full re-sort — options with zero matches under the active filters sink to the end so the list doesn't visibly reshuffle on every toggle. */
function withZeroCountsLast<T extends { _count: { products: number } }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (a._count.products === 0 ? 1 : 0) - (b._count.products === 0 ? 1 : 0),
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  count,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  count?: number;
}) {
  return (
    <label
      htmlFor={id}
      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <span className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
        {label}
      </span>
      {count !== undefined && <span className="text-xs opacity-70">{count}</span>}
    </label>
  );
}

export function FilterSidebar({
  categories,
  brands,
  tags,
  basePath = "/katalog",
  impliedCategory,
  impliedBrand,
  onFilterChange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [priceMin, setPriceMin] = useState(searchParams.get("cenaMin") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("cenaMax") ?? "");

  useEffect(() => {
    setPriceMin(searchParams.get("cenaMin") ?? "");
    setPriceMax(searchParams.get("cenaMax") ?? "");
  }, [searchParams]);

  const CATEGORY_PREVIEW_COUNT = 8;

  const getActiveList = useCallback(
    (paramKey: string): string[] => {
      const fromUrl = searchParams.get(paramKey)?.split(",").filter(Boolean);
      if (fromUrl) return fromUrl;
      if (paramKey === "kategoria" && impliedCategory) return [impliedCategory];
      if (paramKey === "marka" && impliedBrand) return [impliedBrand];
      return [];
    },
    [searchParams, impliedCategory, impliedBrand],
  );

  const active = {
    category: getActiveList("kategoria"),
    brand: getActiveList("marka"),
    tags: getActiveList("tagi"),
  };

  const sortedCategories = withZeroCountsLast(categories);
  const sortedBrands = withZeroCountsLast(brands);

  const visibleCategories = showAllCategories
    ? sortedCategories
    : sortedCategories.slice(0, CATEGORY_PREVIEW_COUNT);
  const visibleSlugs = new Set(visibleCategories.map((c) => c.slug));
  const pinnedActiveCategories = showAllCategories
    ? []
    : sortedCategories.filter((c) => active.category.includes(c.slug) && !visibleSlugs.has(c.slug));
  const hiddenCategoryCount = sortedCategories.length - visibleCategories.length;

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("strona");
      router.push(`${basePath}?${params.toString()}`, { scroll: false });
      onFilterChange?.();
    },
    [router, searchParams, basePath, onFilterChange],
  );

  const toggleMulti = useCallback(
    (paramKey: string, slug: string) => {
      const current = getActiveList(paramKey);
      const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
      setParam(paramKey, next.length > 0 ? next.join(",") : null);
    },
    [getActiveList, setParam],
  );

  const toggleFlag = useCallback(
    (paramKey: string) => {
      setParam(paramKey, searchParams.get(paramKey) === "1" ? null : "1");
    },
    [searchParams, setParam],
  );

  const applyPriceRange = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceMin) params.set("cenaMin", priceMin);
    else params.delete("cenaMin");
    if (priceMax) params.set("cenaMax", priceMax);
    else params.delete("cenaMax");
    params.delete("strona");
    router.push(`${basePath}?${params.toString()}`, { scroll: false });
    onFilterChange?.();
  }, [searchParams, priceMin, priceMax, router, basePath, onFilterChange]);

  const clearAll = useCallback(() => {
    router.push(basePath, { scroll: false });
    onFilterChange?.();
  }, [router, basePath, onFilterChange]);

  const hasActiveFilters =
    active.category.length > 0 ||
    active.brand.length > 0 ||
    active.tags.length > 0 ||
    Boolean(searchParams.get("cenaMin")) ||
    Boolean(searchParams.get("cenaMax")) ||
    searchParams.get("dostepne") === "1" ||
    searchParams.get("promocje") === "1" ||
    searchParams.get("nowosci") === "1" ||
    searchParams.get("polecane") === "1";

  return (
    <aside className="space-y-6">
      <SearchInput />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Filtry</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Wyczyść
          </button>
        )}
      </div>

      {sortedCategories.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Kategoria</p>
          <div className="space-y-1">
            {pinnedActiveCategories.map((cat) => (
              <CheckboxRow
                key={cat.id}
                id={`kategoria-${cat.slug}`}
                checked
                onChange={() => toggleMulti("kategoria", cat.slug)}
                label={cat.namePl}
                count={cat._count.products}
              />
            ))}
            {visibleCategories.map((cat) => (
              <CheckboxRow
                key={cat.id}
                id={`kategoria-${cat.slug}`}
                checked={active.category.includes(cat.slug)}
                onChange={() => toggleMulti("kategoria", cat.slug)}
                label={cat.namePl}
                count={cat._count.products}
              />
            ))}
          </div>
          {(hiddenCategoryCount > 0 || showAllCategories) &&
            sortedCategories.length > CATEGORY_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                className="mt-1.5 text-sm font-medium text-primary hover:text-primary-deep"
              >
                {showAllCategories ? "Pokaż mniej" : `Pokaż więcej (${hiddenCategoryCount})`}
              </button>
            )}
        </div>
      )}

      {sortedBrands.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Marka</p>
          <div className="space-y-1">
            {sortedBrands.map((brand) => (
              <CheckboxRow
                key={brand.id}
                id={`marka-${brand.slug}`}
                checked={active.brand.includes(brand.slug)}
                onChange={() => toggleMulti("marka", brand.slug)}
                label={brand.name}
                count={brand._count.products}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Cena</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="cena-min" className="sr-only">
              Cena od
            </label>
            <input
              id="cena-min"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              onBlur={applyPriceRange}
              onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-2 pr-7 text-sm text-foreground [appearance:textfield] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              zł
            </span>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">–</span>
          <div className="relative flex-1">
            <label htmlFor="cena-max" className="sr-only">
              Cena do
            </label>
            <input
              id="cena-max"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="∞"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onBlur={applyPriceRange}
              onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-2 pr-7 text-sm text-foreground [appearance:textfield] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              zł
            </span>
          </div>
        </div>
        {(priceMin || priceMax) && (
          <button
            type="button"
            onClick={applyPriceRange}
            className="mt-1.5 text-sm font-medium text-primary hover:text-primary-deep"
          >
            Zastosuj
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Dostępność</p>
        <CheckboxRow
          id="dostepne"
          checked={searchParams.get("dostepne") === "1"}
          onChange={() => toggleFlag("dostepne")}
          label="Tylko dostępne"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Wyróżnione</p>
        <div className="space-y-1">
          <CheckboxRow
            id="promocje"
            checked={searchParams.get("promocje") === "1"}
            onChange={() => toggleFlag("promocje")}
            label="Promocje"
          />
          <CheckboxRow
            id="nowosci"
            checked={searchParams.get("nowosci") === "1"}
            onChange={() => toggleFlag("nowosci")}
            label="Nowości"
          />
          <CheckboxRow
            id="polecane"
            checked={searchParams.get("polecane") === "1"}
            onChange={() => toggleFlag("polecane")}
            label="Polecane"
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Cechy</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = active.tags.includes(tag.slug);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleMulti("tagi", tag.slug)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag.namePl}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
