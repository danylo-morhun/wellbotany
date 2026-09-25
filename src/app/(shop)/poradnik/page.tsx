import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublishedPosts } from "@/features/blog/lib/queries";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Poradnik – suplementy, witaminy i zioła",
  description:
    "Poradniki o suplementach diety: jak wybrać magnez, witaminę D3, probiotyk czy adaptogeny, jak czytać etykiety i na co uważać.",
  alternates: { canonical: "/poradnik" },
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export default async function PoradnikPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Strona główna", href: "/" },
          { name: "Poradnik", href: "/poradnik" },
        ]}
      />
      <h1 className="mt-4 font-heading text-3xl text-foreground">Poradnik</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Praktyczne poradniki o suplementach diety, witaminach i ziołach – jak wybierać, czytać
        etykiety i bezpiecznie łączyć produkty. Krótkie opisy składników znajdziesz też w{" "}
        <Link href="/skladniki" className="text-primary hover:underline">
          słowniku składników
        </Link>
        .
      </p>

      {posts.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Pierwsze poradniki już wkrótce.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/poradnik/${post.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-shadow hover:shadow-card-hover"
              >
                {post.coverImage && (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={post.coverImage}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 480px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-heading text-lg text-foreground">{post.titlePl}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{post.excerptPl}</p>
                  {post.publishedAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {dateFormat.format(post.publishedAt)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
