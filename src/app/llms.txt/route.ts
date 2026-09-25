// llms.txt (https://llmstxt.org) — a plain map of the shop for AI search
// crawlers: what it is, the key sections and every guide, in Markdown.
import { getPublishedPosts } from "@/features/blog/lib/queries";
import { getCategories } from "@/features/catalog/actions";
import { MIN_LISTED_PRODUCTS } from "@/features/catalog/lib/nav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

export const revalidate = 3600;

export async function GET() {
  const [posts, categories] = await Promise.all([getPublishedPosts(), getCategories()]);
  const listed = categories
    .filter((c) => c.productCount >= MIN_LISTED_PRODUCTS)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 30);

  const lines = [
    "# Well Botany",
    "",
    "> Polski sklep internetowy z suplementami diety, witaminami, minerałami, ziołami i produktami bio. Przy każdym produkcie: pełny skład, ilość w porcji dziennej, %RWS i sposób użycia. Oświadczenia zdrowotne wyłącznie z rejestru UE (rozporządzenie 432/2012). Dostawa na terenie Polski.",
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
    ...listed.map((c) => `- [${c.headingPl ?? c.namePl}](${SITE_URL}/kategoria/${c.slug})`),
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
