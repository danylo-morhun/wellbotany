"use client";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  categories: { slug: string; namePl: string }[];
  brands: { slug: string; name: string }[];
  tags: { slug: string; namePl: string }[];
  basePath?: string;
};

function formatPln(value: string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`
    : value;
}

export function ActiveFilterChips({ categories, brands, tags, basePath = "/katalog" }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeCategories = searchParams.get("kategoria")?.split(",").filter(Boolean) ?? [];
  const activeBrands = searchParams.get("marka")?.split(",").filter(Boolean) ?? [];
  const activeTags = searchParams.get("tagi")?.split(",").filter(Boolean) ?? [];
  const cenaMin = searchParams.get("cenaMin");
  const cenaMax = searchParams.get("cenaMax");

  const chips: { label: string; onRemove: () => void }[] = [];

  const removeFromList = (param: string, current: string[], value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    const remaining = current.filter((s) => s !== value).join(",");
    if (remaining) p.set(param, remaining);
    else p.delete(param);
    router.push(`${basePath}?${p.toString()}`, { scroll: false });
  };

  for (const slug of activeCategories) {
    const cat = categories.find((c) => c.slug === slug);
    chips.push({
      label: cat?.namePl ?? slug,
      onRemove: () => removeFromList("kategoria", activeCategories, slug),
    });
  }

  for (const slug of activeBrands) {
    const brand = brands.find((b) => b.slug === slug);
    chips.push({
      label: brand?.name ?? slug,
      onRemove: () => removeFromList("marka", activeBrands, slug),
    });
  }

  if (cenaMin || cenaMax) {
    chips.push({
      label: `Cena: ${cenaMin ? formatPln(cenaMin) : "0 zł"} – ${cenaMax ? formatPln(cenaMax) : "∞"}`,
      onRemove: () => {
        const p = new URLSearchParams(searchParams.toString());
        p.delete("cenaMin");
        p.delete("cenaMax");
        router.push(`${basePath}?${p.toString()}`, { scroll: false });
      },
    });
  }

  const flagChips: { param: string; label: string }[] = [
    { param: "dostepne", label: "Tylko dostępne" },
    { param: "promocje", label: "Promocje" },
    { param: "nowosci", label: "Nowości" },
    { param: "polecane", label: "Polecane" },
  ];
  for (const { param, label } of flagChips) {
    if (searchParams.get(param) === "1") {
      chips.push({
        label,
        onRemove: () => {
          const p = new URLSearchParams(searchParams.toString());
          p.delete(param);
          router.push(`${basePath}?${p.toString()}`, { scroll: false });
        },
      });
    }
  }

  for (const slug of activeTags) {
    const tag = tags.find((t) => t.slug === slug);
    chips.push({
      label: tag?.namePl ?? slug,
      onRemove: () => removeFromList("tagi", activeTags, slug),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-3">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Usuń filtr ${chip.label}`}
            className="ml-1 rounded-full transition-colors hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
