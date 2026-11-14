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

// One Subiekt product card (the agent's catalog cycle). Money in grosz.
export const catalogItemSchema = z.object({
  symbol: z.string().trim().min(1).max(64),
  ean: z.string().trim().max(32).optional(),
  name: z.string().trim().min(1).max(255),
  unit: z.string().trim().max(16).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  purchaseNet: z.number().int().positive().optional(),
  pricesGross: z.array(z.number().int().nonnegative()).max(10),
  weightGrams: z.number().int().positive().optional(),
  supplierSymbol: z.string().trim().max(64).optional(),
  supplierName: z.string().trim().max(255).optional(),
  supplierProductCode: z.string().trim().max(64).optional(),
  minStock: z.number().int().optional(),
  // Subiekt's datetime, no zone: "2026-11-10T00:00:00"
  lastDeliveryAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    .optional(),
  lastDeliveryNet: z.number().int().positive().optional(),
  blocked: z.boolean(),
});

export const catalogSnapshotSchema = z
  .object({
    // full: every card of the location (absent ones are deleted); delta: changed + removed
    mode: z.enum(["full", "delta"]),
    agentVersion: z.string().max(32).optional(),
    levelNames: z.array(z.string().max(64)).max(10).optional(),
    items: z.array(catalogItemSchema).max(100_000),
    removed: z.array(z.string().min(1).max(64)).max(100_000).optional(),
  })
  .refine((s) => s.mode === "delta" || !s.removed?.length, { message: "removed is delta-only" });

export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type CatalogSnapshot = z.infer<typeof catalogSnapshotSchema>;
