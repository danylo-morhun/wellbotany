"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { PrivacyNote } from "@/components/PrivacyNote";
import { submitWithdrawal } from "../actions";
import { formatReceivedAt, withdrawalStatement } from "../lib/statement";
import type { WithdrawalInput } from "../schema";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50";
const primaryButton =
  "rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60";

/**
 * Two steps as Dyr. 2011/83 art. 11a asks: fill in the statement, then
 * „Potwierdź odstąpienie od umowy”. No account needed — the order number and
 * its e-mail identify the contract.
 */
export function WithdrawalForm({ orderNumber = "" }: { orderNumber?: string }) {
  const [input, setInput] = useState<WithdrawalInput>({
    name: "",
    email: "",
    orderNumber,
    items: "",
  });
  const [reviewing, setReviewing] = useState(false);
  const { execute, result, isPending } = useAction(submitWithdrawal);

  const set = (field: keyof WithdrawalInput) => (e: { target: { value: string } }) =>
    setInput((prev) => ({ ...prev, [field]: e.target.value }));

  if (result.data) {
    return (
      <div className="rounded-2xl bg-card p-6 shadow-card" role="status">
        <p className="font-semibold text-primary">✓ Otrzymaliśmy Twoje oświadczenie</p>
        <p className="mt-2 text-sm">
          Data i godzina otrzymania:{" "}
          <strong>{formatReceivedAt(new Date(result.data.createdAt))}</strong>
        </p>
        <p className="mt-3 rounded-lg bg-muted p-3 text-sm">{withdrawalStatement(input)}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Potwierdzenie wysłaliśmy na {input.email}. Odeślij towar w ciągu 14 dni — adres i zasady
          zwrotu płatności znajdziesz w e-mailu.
        </p>
      </div>
    );
  }

  if (reviewing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Sprawdź treść oświadczenia:</p>
        <p className="rounded-2xl bg-card p-4 text-sm shadow-card">{withdrawalStatement(input)}</p>
        <p className="text-sm text-muted-foreground">
          Potwierdzenie wyślemy na <strong className="text-foreground">{input.email}</strong>.
        </p>
        {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => execute(input)}
            disabled={isPending}
            className={primaryButton}
          >
            {isPending ? "Wysyłanie…" : "Potwierdź odstąpienie od umowy"}
          </button>
          <button
            type="button"
            onClick={() => setReviewing(false)}
            disabled={isPending}
            className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-muted/50"
          >
            Popraw dane
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setReviewing(true);
      }}
    >
      <div>
        <label htmlFor="wd-order" className="mb-1 block text-sm font-medium">
          Numer zamówienia *
        </label>
        <input
          id="wd-order"
          required
          minLength={3}
          value={input.orderNumber}
          onChange={set("orderNumber")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wd-email" className="mb-1 block text-sm font-medium">
          E-mail podany w zamówieniu *
        </label>
        <input
          id="wd-email"
          type="email"
          required
          autoComplete="email"
          value={input.email}
          onChange={set("email")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wd-name" className="mb-1 block text-sm font-medium">
          Imię i nazwisko *
        </label>
        <input
          id="wd-name"
          required
          minLength={3}
          autoComplete="name"
          value={input.name}
          onChange={set("name")}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wd-items" className="mb-1 block text-sm font-medium">
          Od których produktów odstępujesz?
        </label>
        <textarea
          id="wd-items"
          rows={3}
          maxLength={2000}
          value={input.items}
          onChange={set("items")}
          placeholder="Zostaw puste, jeśli odstępujesz od całego zamówienia"
          className={inputClass}
        />
      </div>
      <button type="submit" className={primaryButton}>
        Dalej
      </button>
      <PrivacyNote purpose="Dane przetwarzamy, aby przyjąć Twoje odstąpienie od umowy i zwrócić płatność." />
    </form>
  );
}
