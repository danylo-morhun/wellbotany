// Stock vs online sales — pure. Sales come from web orders only; the shop
// counter sells too, so real cover is shorter than shown.

/** Fewer days of stock than this → reorder */
export const REORDER_DAYS = 14;

export type StockRow = {
  variantId: string;
  stock: number;
  /** Units sold online in the velocity window */
  sold: number;
};

/** Days the stock lasts at the window's sales pace; null when nothing sold */
export function daysOfCover(stock: number, sold: number, windowDays: number): number | null {
  if (sold <= 0) return null;
  return Math.floor(Math.max(stock, 0) / (sold / windowDays));
}

/** Selling variants that run out within REORDER_DAYS, soonest first */
export function runningOut<T extends StockRow>(rows: T[], windowDays: number) {
  return rows
    .map((r) => ({ ...r, cover: daysOfCover(r.stock, r.sold, windowDays) }))
    .filter((r): r is T & { cover: number } => r.cover !== null && r.cover < REORDER_DAYS)
    .sort((a, b) => a.cover - b.cover || b.sold - a.sold);
}
