// llms.txt (https://llmstxt.org) — a plain map of the shop for AI search
// crawlers: what it is, the key sections and every guide, in Markdown.
import { getPublishedPosts } from "@/features/blog/lib/queries";
import { getCategories } from "@/features/catalog/actions";
import { FOOD_SLUG, foodSubcategories } from "@/features/catalog/lib/food";
import { MIN_LISTED_PRODUCTS } from "@/features/catalog/lib/nav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

export const revalidate = 86400;

export async function GET() {
  const [posts, categories] = await Promise.all([getPublishedPosts(), getCategories()]);
  const bySize = categories
    .filter((c) => c.productCount >= MIN_LISTED_PRODUCTS)
    .sort((a, b) => b.productCount - a.productCount);
  // Food gets its own section; the rest of the shop lists its 30 biggest categories
  const food = foodSubcategories(bySize);
  const listed = bySize.filter((c) => c.slug !== FOOD_SLUG && !food.includes(c)).slice(0, 30);
  const link = (c: (typeof bySize)[number]) =>
    `- [${c.headingPl ?? c.namePl}](${SITE_URL}/kategoria/${c.slug})`;

  const lines = [
    "# Well Botany",
    "",
    "> Polski sklep internetowy z suplementami diety, ziołami i zdrową żywnością. Suplementy: witaminy, minerały, ekstrakty roślinne, probiotyki. Żywność: czekolady, ciastka, przekąski słone i owocowe, batony, słodycze, kawa, herbata i przyprawy. Przy każdym produkcie: pełny skład, a przy suplementach także ilość w porcji dziennej, %RWS i sposób użycia. Oświadczenia zdrowotne wyłącznie z rejestru UE (rozporządzenie 432/2012). Dostawa na terenie Polski.",
    "",
    "## Poradniki",
    "",
    ...posts.map((p) => `- [${p.titlePl}](${SITE_URL}/poradnik/${p.slug}): ${p.excerptPl}`),
    "",
    "## Sklep",
    "",
    `- [Katalog produktów](${SITE_URL}/katalog)`,
    `- [Składniki A–Z](${SITE_URL}/skladniki): słownik składników suplementów – formy, dawki, zatwierdzone oświadczenia`,
    `- [Marki](${SITE_URL}/marki)`,
    ...listed.map(link),
    "",
    "## Zdrowa żywność",
    "",
    `- [Zdrowa żywność](${SITE_URL}/kategoria/${FOOD_SLUG}): cały dział spożywczy – słodycze, przekąski, kawa, herbata, przyprawy`,
    ...food.map(link),
    "",
    "## Informacje",
    "",
    `- [FAQ](${SITE_URL}/faq)`,
    `- [Dostawa i płatność](${SITE_URL}/dostawa)`,
    `- [Zwroty i reklamacje](${SITE_URL}/zwroty)`,
    `- [Regulamin](${SITE_URL}/regulamin)`,
    `- [Kontakt](${SITE_URL}/kontakt)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
