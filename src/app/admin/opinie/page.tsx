import { MessageSquareQuote } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState, PageHeader, relativeDate } from "@/app/admin/components/ui";
import { ModerationButtons } from "@/features/reviews/components/ModerationButtons";
import { Stars } from "@/features/reviews/components/Stars";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opinie" };

const TABS = [
  { status: "PENDING", label: "Do moderacji" },
  { status: "APPROVED", label: "Opublikowane" },
  { status: "REJECTED", label: "Odrzucone" },
] as const;

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? "PENDING";
  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
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
        product: {
          select: {
            id: true,
            namePl: true,
            slug: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Opinie"
        description="Opinie zweryfikowanych kupujących. Publikuj pozytywne i negatywne — odrzucaj tylko treści niezgodne z regulaminem (wulgaryzmy, dane osobowe, obietnice leczenia)."
      />
      <nav
        aria-label="Status opinii"
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/opinie?status=${t.status}`}
            aria-current={t.status === status ? "page" : undefined}
            className={cn(
              "-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium",
              t.status === status
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="rounded-full bg-muted px-1.5 text-xs leading-5 tabular-nums">
              {countFor(t.status)}
            </span>
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card">
          <EmptyState icon={MessageSquareQuote} title="Brak opinii w tej zakładce" />
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-4 rounded-2xl bg-card p-5 shadow-card">
              <Link
                href={`/admin/produkty/${r.product.id}`}
                className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted"
              >
                {r.product.images[0] && (
                  <Image
                    src={r.product.images[0].url}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/produkt/${r.product.slug}`}
                      target="_blank"
                      className="font-medium hover:text-primary"
                    >
                      {r.product.namePl}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Stars rating={r.rating} />
                      <span>
                        {r.authorName} · {relativeDate(r.createdAt, now)} ·{" "}
                        <Link href={`/admin/zamowienia/${r.order.id}`} className="hover:underline">
                          {r.order.orderNumber}
                        </Link>
                      </span>
                    </div>
                  </div>
                  <ModerationButtons id={r.id} status={r.status} />
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{r.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
