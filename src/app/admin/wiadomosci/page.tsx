import { Inbox, Reply } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, formatDateTime, PageHeader, relativeDate } from "@/app/admin/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { MessageReadToggle } from "@/features/contact/components/MessageReadToggle";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wiadomości" };

type Props = { searchParams: Promise<{ id?: string }> };

export default async function AdminMessagesPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const current = messages.find((m) => m.id === id) ?? null;
  const now = new Date();
  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div>
      <PageHeader
        title="Wiadomości"
        description={
          unread ? `${unread} nieprzeczytanych z formularza kontaktowego` : "Formularz kontaktowy"
        }
      />

      {messages.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card">
          <EmptyState icon={Inbox} title="Brak wiadomości" />
        </div>
      ) : (
        <div className="grid min-h-[60vh] overflow-hidden rounded-2xl bg-card shadow-card md:grid-cols-[340px_minmax(0,1fr)]">
          <ul
            className={cn(
              "max-h-[75vh] divide-y divide-border overflow-y-auto border-border md:border-r",
              current && "hidden md:block",
            )}
          >
            {messages.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/wiadomosci?id=${m.id}`}
                  className={cn(
                    "block px-4 py-3 transition-colors hover:bg-muted/50 motion-reduce:transition-none",
                    m.id === current?.id && "bg-secondary/60 hover:bg-secondary/60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {!m.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Nowa</span>
                      </span>
                    )}
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        !m.isRead && "font-semibold",
                      )}
                    >
                      {m.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeDate(m.createdAt, now)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "truncate text-sm",
                      !m.isRead ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {m.subject}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.message}</p>
                </Link>
              </li>
            ))}
          </ul>

          {current ? (
            <article className="p-6">
              <Link
                href="/admin/wiadomosci"
                className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground md:hidden"
              >
                ← Wszystkie wiadomości
              </Link>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
                <div>
                  <h2 className="text-lg font-semibold">{current.subject}</h2>
                  <p className="text-sm">
                    {current.name}{" "}
                    <span className="text-muted-foreground">&lt;{current.email}&gt;</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(current.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MessageReadToggle key={current.id} id={current.id} isRead={current.isRead} />
                  <a
                    href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject}`)}`}
                    className={buttonVariants({ size: "lg" })}
                  >
                    <Reply aria-hidden />
                    Odpowiedz
                  </a>
                </div>
              </div>
              <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line">
                {current.message}
              </p>
              <Link
                href={`/admin/zamowienia?szukaj=${encodeURIComponent(current.email)}`}
                className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
              >
                Zamówienia tego klienta →
              </Link>
            </article>
          ) : (
            <div className="hidden items-center justify-center md:flex">
              <EmptyState icon={Inbox} title="Wybierz wiadomość z listy" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
