"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Section, Switch, TextInput } from "@/features/products/components/editor/fields";
import { saveTierPromo } from "../actions";
import type { TierPromo } from "../lib/tiered";

// Three fixed slots; `id` keeps React keys stable
type Row = { id: string; minZl: string; percent: string };

// <input type="datetime-local"> works in the admin's local time (Poland)
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function TierPromoForm({ promo }: { promo: TierPromo | null }) {
  const [enabled, setEnabled] = useState(promo !== null);
  const [name, setName] = useState(promo?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() => {
    const tiers = promo?.tiers ?? [];
    return ["t1", "t2", "t3"].map((id, i) => ({
      id,
      minZl: tiers[i] ? String(tiers[i].minPln / 100) : "",
      percent: tiers[i] ? String(tiers[i].percent) : "",
    }));
  });
  const [startsAt, setStartsAt] = useState(toLocalInput(promo?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(promo?.endsAt ?? null));

  const { execute, isPending } = useAction(saveTierPromo, {
    onSuccess: () => toast.success("Promocja zapisana"),
    onError: ({ error }) => {
      const issues = error.validationErrors as
        | Record<string, { _errors?: string[] } | string[] | undefined>
        | undefined;
      const first = Object.values(issues ?? {})
        .flatMap((v) => (Array.isArray(v) ? v : (v?._errors ?? [])))
        .at(0);
      toast.error("Błąd", { description: error.serverError ?? first ?? "Sprawdź pola" });
    },
  });

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const tiers = rows
      .filter((r) => r.minZl.trim() && r.percent.trim())
      .map((r) => ({
        minPln: Math.round(Number(r.minZl.replace(",", ".")) * 100),
        percent: Math.round(Number(r.percent)),
      }));
    execute({
      name: enabled ? name.trim() : null,
      tiers,
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      <Section
        title="Rabat od wartości koszyka"
        description="Np. -5% od 150 zł, -10% od 250 zł. Nie obejmuje produktów w promocji i nie łączy się z kodami — klient dostaje korzystniejszy rabat. Ceny produktów się nie zmieniają, więc nie trzeba pokazywać ceny z 30 dni."
      >
        <Switch label="Włącz promocję" checked={enabled} onChange={setEnabled} />
        {enabled && (
          <>
            <Field
              label="Nazwa"
              htmlFor="promoName"
              hint="Widoczna w pasku na górze strony, w koszyku i w e-mailu."
            >
              <TextInput
                id="promoName"
                required
                minLength={2}
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Black Week"
              />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Progi (do 3)</p>
              {rows.map((row, i) => (
                <div key={row.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">od</span>
                  <TextInput
                    aria-label={`Próg ${i + 1}: kwota`}
                    inputMode="decimal"
                    value={row.minZl}
                    onChange={(e) => setRow(i, { minZl: e.target.value })}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">zł →</span>
                  <TextInput
                    aria-label={`Próg ${i + 1}: rabat w procentach`}
                    inputMode="numeric"
                    value={row.percent}
                    onChange={(e) => setRow(i, { percent: e.target.value })}
                    className="w-16"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Początek" htmlFor="promoStart" hint="Puste — od razu">
                <TextInput
                  id="promoStart"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </Field>
              <Field label="Koniec" htmlFor="promoEnd" hint="Puste — do wyłączenia">
                <TextInput
                  id="promoEnd"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </Field>
            </div>
          </>
        )}
      </Section>
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Zapisywanie…" : "Zapisz promocję"}
      </Button>
    </form>
  );
}
