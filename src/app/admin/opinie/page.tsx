import Link from "next/link";
import { ModerationButtons } from "@/features/reviews/components/ModerationButtons";
import { Stars } from "@/features/reviews/components/Stars";
import { prisma } from "@/lib/prisma";

const TABS = [
  { status: "PENDING", label: "Do moderacji" },
  { status: "APPROVED", label: "Opublikowane" },
  { status: "REJECTED", label: "Odrzucone" },
] as const;

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? "PENDING";
  const reviews = await prisma.review.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      authorName: true,
      rating: true,
      content: true,
      status: true,
      createdAt: true,
      product: { select: { namePl: true, slug: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opinie</h1>
        <p className="text-sm text-muted-foreground">
          Opinie zweryfikowanych kupujących. Publikuj pozytywne i negatywne – odrzucaj tylko treści
          niezgodne z regulaminem (wulgaryzmy, dane osobowe, obietnice leczenia).
        </p>
      </div>
      <nav className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/opinie?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm ${t.status === status ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-card">
          Brak opinii w tej zakładce.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars rating={r.rating} />
                  <Link href={`/produkt/${r.product.slug}`} className="font-medium hover:underline">
                    {r.product.namePl}
                  </Link>
                </div>
                <ModerationButtons id={r.id} status={r.status} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{r.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {r.authorName} · {r.createdAt.toLocaleString("pl-PL")} ·{" "}
                <Link href={`/admin/zamowienia/${r.order.id}`} className="hover:underline">
                  {r.order.orderNumber}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
