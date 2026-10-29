import type { ExpenseCategory } from "@prisma/client";

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  ADS_GOOGLE: "Reklama Google",
  ADS_META: "Reklama Meta (FB/IG)",
  ADS_ALLEGRO: "Allegro Ads",
  ADS_OTHER: "Reklama — inna",
  SHIPPING: "Wysyłki (faktury przewoźników)",
  PACKAGING: "Opakowania",
  SERVICES: "Usługi i abonamenty",
  OTHER: "Inne",
};

export const isAdSpend = (c: ExpenseCategory) => c.startsWith("ADS_");

export type ExpenseLike = { category: ExpenseCategory; amountPln: number };

export function expenseTotals(expenses: ExpenseLike[]) {
  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of expenses)
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountPln);
  const total = expenses.reduce((s, e) => s + e.amountPln, 0);
  const ads = expenses.filter((e) => isAdSpend(e.category)).reduce((s, e) => s + e.amountPln, 0);
  return { byCategory, total, ads };
}
