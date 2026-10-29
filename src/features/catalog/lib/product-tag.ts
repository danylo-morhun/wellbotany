// Cache tag of one product page, so a stock change refreshes that page only
// instead of the whole "products" tag (every product, listing and the home page).
export const productTag = (slug: string) => `product:${slug}`;
