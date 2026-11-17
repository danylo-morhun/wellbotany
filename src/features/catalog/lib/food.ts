// The food range: the "zywnosc" root and its children. Chocolate used to be a
// root of its own and is being moved under "zywnosc" — both trees work.
export const FOOD_SLUG = "zywnosc";
export const CHOCOLATE_SLUG = "czekolady-i-czekoladki";

type FoodCategory = { id: string; slug: string; parentId: string | null; productCount: number };

const separateChocolate = <C extends FoodCategory>(categories: C[], food: C | undefined) =>
  categories.find((c) => c.slug === CHOCOLATE_SLUG && (food == null || c.parentId !== food.id));

/** Food products on sale; chocolate counted once, inside or outside "zywnosc". */
export function foodProductCount(categories: FoodCategory[]): number {
  const food = categories.find((c) => c.slug === FOOD_SLUG);
  return (food?.productCount ?? 0) + (separateChocolate(categories, food)?.productCount ?? 0);
}

/** Food subcategories: children of "zywnosc", plus chocolate while it is a root. */
export function foodSubcategories<C extends FoodCategory>(categories: C[]): C[] {
  const food = categories.find((c) => c.slug === FOOD_SLUG);
  const chocolate = separateChocolate(categories, food);
  return categories.filter((c) => c === chocolate || (food != null && c.parentId === food.id));
}
