import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum([
    "ADS_GOOGLE",
    "ADS_META",
    "ADS_ALLEGRO",
    "ADS_OTHER",
    "SHIPPING",
    "PACKAGING",
    "SERVICES",
    "OTHER",
  ]),
  // Net grosz
  amountPln: z.number().int().positive("Podaj kwotę większą od zera"),
  // "2026-10-31" — the shop-local day the cost belongs to
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę"),
  note: z.string().trim().max(200).optional(),
});

export const expenseIdSchema = z.object({ id: z.string().min(1) });
