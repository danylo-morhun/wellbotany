"use client";

import type { ExpenseCategory } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addExpense, deleteExpense } from "../actions";
import { EXPENSE_LABELS } from "../lib/expenses";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50";

const toGrosz = (v: string) => {
  const n = Number(v.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export function ExpenseForm({ defaultDate }: { defaultDate: string }) {
  const form = useRef<HTMLFormElement>(null);
  const { execute, isPending } = useAction(addExpense, {
    onSuccess: () => {
      toast.success("Koszt dodany");
      form.current?.reset();
    },
    onError: ({ error }) => {
      const first = Object.values(error.validationErrors ?? {})
        .map((v) => (v as { _errors?: string[] })?._errors?.[0])
        .find(Boolean);
      toast.error(first ?? error.serverError ?? "Nie udało się dodać kosztu");
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execute({
      category: String(fd.get("category")) as ExpenseCategory,
      amountPln: toGrosz(String(fd.get("amount") ?? "")),
      date: String(fd.get("date") ?? ""),
      note: String(fd.get("note") ?? ""),
    });
  }

  return (
    <form
      ref={form}
      onSubmit={onSubmit}
      className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto] sm:items-end"
    >
      <label className="text-sm font-medium">
        <span className="mb-1 block">Rodzaj</span>
        <select name="category" className={inputClass} defaultValue="ADS_GOOGLE">
          {Object.entries(EXPENSE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        <span className="mb-1 block">Kwota netto (zł)</span>
        <input name="amount" inputMode="decimal" required className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        <span className="mb-1 block">Dzień</span>
        <input name="date" type="date" required defaultValue={defaultDate} className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        <span className="mb-1 block">Opis (opcjonalnie)</span>
        <input
          name="note"
          maxLength={200}
          placeholder="np. faktura 10/2026"
          className={inputClass}
        />
      </label>
      <Button type="submit" disabled={isPending}>
        Dodaj
      </Button>
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const { execute, isPending } = useAction(deleteExpense, {
    onSuccess: () => toast.success("Koszt usunięty"),
    onError: () => toast.error("Nie udało się usunąć kosztu"),
  });
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={isPending}
      aria-label="Usuń koszt"
      onClick={() => execute({ id })}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );
}
