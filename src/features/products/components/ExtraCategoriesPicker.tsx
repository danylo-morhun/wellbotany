"use client";

import type { Category, CategoryGroup } from "@prisma/client";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  NEED: "Na co",
  AUDIENCE: "Dla kogo",
  TYPE: "Rodzaj",
  OTHER: "Inne",
};
const GROUP_ORDER: CategoryGroup[] = ["NEED", "AUDIENCE", "TYPE", "OTHER"];

type Props = {
  categories: Category[];
  primaryId: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
};

/** Categories a product is listed in besides its primary one — e.g. "Magnez" also under "Na sen". */
export function ExtraCategoriesPicker({ categories, primaryId, selected, onToggle }: Props) {
  const byName = [...categories].sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"));
  return (
    <section className="rounded-2xl bg-card p-5 shadow-card">
      <h2 className="font-semibold">Dodatkowe kategorie</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Produkt pojawi się też w tych kategoriach. Kategoria główna (wyżej) decyduje o ścieżce i
        adresie kanonicznym.
      </p>
      <div className="space-y-4">
        {GROUP_ORDER.map((group) => {
          const options = byName.filter((c) => c.group === group && c.id !== primaryId);
          if (options.length === 0) return null;
          return (
            <fieldset key={group}>
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
                {GROUP_LABELS[group]}
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {options.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => onToggle(c.id)}
                    />
                    {c.namePl}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
