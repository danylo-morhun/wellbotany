import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Posts are also written by scripts/content-pass/apply-posts.ts, which can't
// revalidate this path — always read fresh
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      titlePl: true,
      isPublished: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Poradnik</h1>
          <p className="text-sm text-muted-foreground">
            Artykuły na /poradnik. Tylko oświadczenia zdrowotne z rejestru UE (rozp. 432/2012).
          </p>
        </div>
        <Link
          href="/admin/poradnik/nowy"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          + Dodaj
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-card">
          Brak artykułów.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl bg-card shadow-card">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/admin/poradnik/${post.id}`} className="font-medium hover:underline">
                  {post.titlePl}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  /poradnik/{post.slug} · zmieniono {dateFormat.format(post.updatedAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${post.isPublished ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {post.isPublished && post.publishedAt
                  ? `Opublikowany ${dateFormat.format(post.publishedAt)}`
                  : "Szkic"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
