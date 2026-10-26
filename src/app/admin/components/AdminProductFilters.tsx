"use client";

import type { ProductStatus } from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClass } from "@/features/products/components/editor/fields";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "DRAFT", label: "Szkic" },
  { value: "ACTIVE", label: "Aktywny" },
  { value: "ARCHIVED", label: "Zarchiwizowany" },
];

const NONE_VALUE = "__brak__";

type Props = {
  brands: { id: string; name: string }[];
  categories: { id: string; namePl: string }[];
};

export function AdminProductFilters({ brands, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("strona");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const selectClass = cn(
    inputClass,
    "h-9 w-auto max-w-[42vw] truncate bg-card px-2.5 sm:max-w-[220px]",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filtruj po statusie"
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectClass}
      >
        <option value="">Wszystkie statusy</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtruj po marce"
        value={searchParams.get("marka") ?? ""}
        onChange={(e) => setParam("marka", e.target.value)}
        className={selectClass}
      >
        <option value="">Wszystkie marki</option>
        <option value={NONE_VALUE}>— Bez marki —</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtruj po kategorii"
        value={searchParams.get("kategoria") ?? ""}
        onChange={(e) => setParam("kategoria", e.target.value)}
        className={selectClass}
      >
        <option value="">Wszystkie kategorie</option>
        <option value={NONE_VALUE}>— Bez kategorii —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.namePl}
          </option>
        ))}
      </select>

      <select
        aria-label="Braki w karcie"
        value={searchParams.get("brak") ?? ""}
        onChange={(e) => setParam("brak", e.target.value)}
        className={selectClass}
      >
        <option value="">Wszystkie karty</option>
        <option value="ean">Brak EAN</option>
        <option value="opis">Brak opisu</option>
      </select>

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={searchParams.get("zdjecie") === NONE_VALUE}
          onChange={(e) => setParam("zdjecie", e.target.checked ? NONE_VALUE : "")}
        />
        Bez zdjęcia
      </label>
    </div>
  );
}
