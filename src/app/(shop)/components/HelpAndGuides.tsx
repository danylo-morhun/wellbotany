import { ArrowRight, Clock, Mail, Phone } from "lucide-react";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { getHomeGuides } from "@/features/catalog/lib/homepage";
import { SELLER } from "@/lib/seller";
import { SectionHeading, sectionTitleClass } from "./SectionHeading";

// Same hours as /kontakt and the footer

type Props = { categories: CategoryItem[] };

/** One band: a way to ask us, beside the latest Poradnik guides. */
export async function HelpAndGuides({ categories }: Props) {
  const posts = await getHomeGuides();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <section
        aria-labelledby="help-h"
        className="flex flex-col items-start gap-3 rounded-2xl bg-card p-5 shadow-card md:gap-4 md:p-8"
      >
        <h2 id="help-h" className={sectionTitleClass}>
          Masz pytanie o skład albo dawkowanie?
        </h2>
        <ul className="text-sm">
          <li>
            <a
              href={`tel:${SELLER.phone.replace(/\s/g, "")}`}
              className="inline-flex min-h-11 items-center gap-2.5 font-semibold text-foreground hover:text-primary"
            >
              <Phone className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
              {SELLER.phone}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${SELLER.email}`}
              className="inline-flex min-h-11 items-center gap-2.5 font-semibold text-foreground hover:text-primary"
            >
              <Mail className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
              {SELLER.email}
            </a>
          </li>
          <li className="flex min-h-11 items-center gap-2.5 text-muted-foreground">
            <Clock className="size-5 text-primary" strokeWidth={1.75} aria-hidden />
            {SELLER.hours}
          </li>
        </ul>
        <Link
          href="/kontakt"
          className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:bg-primary-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Napisz do nas
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </Link>
      </section>

      {posts.length > 0 && (
        <section aria-labelledby="guides-h" className="space-y-3">
          <SectionHeading
            id="guides-h"
            title="Z poradnika"
            link={{ href: "/poradnik", label: "Wszystkie artykuły" }}
          />
          {/* A list split by hairlines, not three look-alike cards */}
          <ul className="divide-y divide-border rounded-2xl bg-card px-5 shadow-card">
            {posts.map((post) => {
              const topic = categories.find((c) => c.slug === post.categorySlug)?.namePl;
              return (
                <li key={post.slug}>
                  <Link
                    href={`/poradnik/${post.slug}`}
                    className="group flex items-center gap-4 py-4"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {[topic, `${post.readingMinutes} min czytania`].filter(Boolean).join(" · ")}
                      </span>
                      <span className="font-bold leading-snug text-foreground group-hover:text-primary">
                        {post.titlePl}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
