import { pluralize } from "../lib/plural";
import { Stars } from "./Stars";

type Props = {
  average: number | null;
  count: number;
  items: { id: string; authorName: string; rating: number; content: string; createdAt: Date }[];
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export function ProductReviews({ average, count, items }: Props) {
  return (
    <section aria-labelledby="opinie-heading">
      <h2 id="opinie-heading" className="text-lg font-semibold text-foreground">
        Opinie klientów
      </h2>
      {count > 0 && average ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <Stars rating={average} className="size-5" />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1).replace(".", ",")} / 5 · {count} {pluralize(count)}
            </span>
          </div>
          <ul className="mt-4 space-y-4">
            {items.map((r) => (
              <li key={r.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-medium text-foreground">{r.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {dateFormat.format(r.createdAt)} · zweryfikowany zakup
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {r.content}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Ten produkt nie ma jeszcze opinii.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Opinie mogą wystawiać wyłącznie klienci, którzy kupili produkt w naszym sklepie – link do
        formularza wysyłamy po dostarczeniu zamówienia. Publikujemy opinie pozytywne i negatywne.
      </p>
    </section>
  );
}
