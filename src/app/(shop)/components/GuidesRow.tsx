import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getPublishedPosts } from "@/features/blog/lib/queries";
import type { CategoryItem } from "@/features/catalog/actions";
import { SectionHeading } from "./SectionHeading";

const GUIDES_LIMIT = 3;

type Props = { categories: CategoryItem[] };

export async function GuidesRow({ categories }: Props) {
  const posts = (await getPublishedPosts()).slice(0, GUIDES_LIMIT);
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="guides-h" className="space-y-5">
      <SectionHeading
        id="guides-h"
        title="Z poradnika"
        link={{ href: "/poradnik", label: "Wszystkie artykuły" }}
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {posts.map((post) => {
          const topic = categories.find((c) => c.slug === post.categorySlug)?.namePl;
          return (
            <li key={post.slug}>
              <Link
                href={`/poradnik/${post.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl bg-card p-6 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {topic && (
                  <span className="self-start rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary-deep">
                    {topic}
                  </span>
                )}
                <span className="text-lg font-bold leading-snug text-foreground group-hover:text-primary">
                  {post.titlePl}
                </span>
                {post.excerptPl && (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {post.excerptPl}
                  </span>
                )}
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Czytaj
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
