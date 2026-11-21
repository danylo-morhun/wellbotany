import type { CategoryItem, ProductListItem } from "@/features/catalog/actions";
import { HomeCategoryShelf } from "./HomeCategoryShelf";

type Props = { products: ProductListItem[]; categories: CategoryItem[] };

/** Food range in its own shelf: one product per food category, then links to each. */
export function HomeFoodShelf({ products, categories }: Props) {
  return (
    <HomeCategoryShelf
      id="food"
      title="Słodko, ale z dobrym składem"
      lead="Czekolady, przekąski, kawa i herbata — dorzuć do paczki z suplementami."
      link={{ href: "/kategoria/zywnosc", label: "Zdrowa żywność" }}
      products={products}
      categories={categories}
    />
  );
}
