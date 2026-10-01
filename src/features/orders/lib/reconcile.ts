export type UnpaidOrder = { id: string; orderNumber: string; totalPln: number };

export type TransferMatch = {
  orderId: string;
  /** Statement line the order number was found on */
  line: string;
  amountMatches: boolean;
  /** Amounts (grosz) found around the match — for showing a mismatch */
  amounts: number[];
};

/**
 * "TZ-2026-00012" also matches "tz 2026 00012" and "TZ202600012", but not
 * "TZ-2026-000123" (a trailing digit means a different, longer number).
 */
function orderNumberPattern(orderNumber: string): RegExp {
  const parts = orderNumber.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return new RegExp(`(?<![A-Za-z0-9])${parts.join("[^A-Za-z0-9\\n]{0,3}")}(?!\\d)`, "i");
}

// 1 234,56 / 1.234,56 / 1234.56 / 49,90 — thousands separated by space, NBSP or dot
const AMOUNT_RE = /(?<![\d,.])(\d{1,3}(?:[ \u00a0.]\d{3})+|\d+)[,.](\d{2})(?![\d])/g;

// 30.09.2026 / 2026-09-30 / 30-09-2026 — dates would otherwise read as "30,09" or "1,10"
const DATE_RE = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/g;

function parseAmounts(text: string): number[] {
  const out: number[] = [];
  for (const m of text.replace(DATE_RE, " ").matchAll(AMOUNT_RE)) {
    const whole = Number(m[1].replace(/[ \u00a0.]/g, ""));
    out.push(whole * 100 + Number(m[2]));
  }
  return out;
}

/**
 * Finds unpaid orders whose number appears in a pasted bank statement.
 * Bank exports put title and amount on nearby lines, so amounts are read
 * from a small window around the matching line.
 */
export function matchTransfers(statement: string, orders: UnpaidOrder[]): TransferMatch[] {
  const lines = statement.split(/\r?\n/);
  const matches: TransferMatch[] = [];

  for (const order of orders) {
    const pattern = orderNumberPattern(order.orderNumber);
    const idx = lines.findIndex((l) => pattern.test(l));
    if (idx === -1) continue;
    const window = lines.slice(Math.max(0, idx - 3), idx + 4).join("\n");
    const amounts = parseAmounts(window);
    matches.push({
      orderId: order.id,
      line: lines[idx].trim(),
      amountMatches: amounts.includes(order.totalPln),
      amounts,
    });
  }
  return matches;
}
