import { z } from "zod";

// One Subiekt GT product as the shop agent reports it. quantity is already
// "stan − rezerwacje" summed over the location's magazyny.
export const stockItemSchema = z.object({
  symbol: z.string().trim().min(1).max(64), // tw_Symbol
  ean: z.string().trim().max(32).optional(), // tw_PodstKodKresk, "" when missing
  quantity: z.number().int(),
});

export const stockSnapshotSchema = z.object({
  // full: every product of the location (absent ones drop to 0); delta: changes only
  mode: z.enum(["full", "delta"]),
  agentVersion: z.string().max(32).optional(),
  items: z.array(stockItemSchema).max(50_000),
});

export type StockItem = z.infer<typeof stockItemSchema>;
export type StockSnapshot = z.infer<typeof stockSnapshotSchema>;

// Orders the agent found in Subiekt (their number in a document's uwagi)
export const enteredOrdersSchema = z.object({
  orderNumbers: z.array(z.string().regex(/^TZ-\d{4}-\d{5}$/)).max(500),
});
