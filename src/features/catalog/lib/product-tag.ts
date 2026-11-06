// Cache tag of one product page, so a stock change refreshes that page only
// instead of the whole "products" tag (every product, listing and the home page).
export const productTag = (slug: string) => `product:${slug}`;

// Cache tag of lists that sort or filter by availability (home page slots,
// search / filter candidates). When a product sells out or comes back, the
// stock sync refreshes these and that product's page — not every page under
// "products", which crawlers would then re-render one by one from the DB.
export const STOCK_LISTINGS_TAG = "stock-listings";
