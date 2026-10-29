// New vs returning buyers — pure. A buyer is an e-mail (guests have no account).

export type BuyerSplit = { newBuyers: number; returningBuyers: number; returningOrders: number };

/**
 * @param periodOrders e-mails of the period's sold orders (one per order)
 * @param firstOrderAt each e-mail's first sold order ever
 */
export function splitBuyers(
  periodOrders: string[],
  firstOrderAt: Map<string, Date>,
  periodStart: Date,
): BuyerSplit {
  const isReturning = (email: string) => (firstOrderAt.get(email) ?? periodStart) < periodStart;
  const buyers = new Set(periodOrders);
  let returningBuyers = 0;
  for (const email of buyers) if (isReturning(email)) returningBuyers++;
  return {
    newBuyers: buyers.size - returningBuyers,
    returningBuyers,
    returningOrders: periodOrders.filter(isReturning).length,
  };
}

/** Orders by buyers who already bought before the period, 0–100 */
export const returningShare = (s: BuyerSplit, orders: number) =>
  orders ? Math.round((s.returningOrders / orders) * 100) : 0;
