// Margin on a variant, net of VAT — prices are gross, `costPricePln` is net
// purchase cost (all grosz). Shown only in the admin.

export function netPricePln(grossPln: number, vatRate: number): number {
  return Math.round(grossPln / (1 + vatRate / 100));
}

export type Margin = {
  /** Net price minus cost, grosz */
  marginPln: number;
  /** Margin as % of the net price, rounded */
  percent: number;
  /**
   * Lowest ROAS (gross conversion value ÷ ad cost) at which an ad-driven sale
   * still breaks even; null when the variant loses money before any ads
   */
  breakEvenRoas: number | null;
};

export function variantMargin(grossPln: number, costPln: number, vatRate: number): Margin | null {
  if (grossPln <= 0 || costPln <= 0) return null;
  const net = netPricePln(grossPln, vatRate);
  const marginPln = net - costPln;
  return {
    marginPln,
    percent: Math.round((marginPln / net) * 100),
    breakEvenRoas: marginPln > 0 ? Math.round((grossPln / marginPln) * 10) / 10 : null,
  };
}
