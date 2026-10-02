import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const sectionTitleClass =
  "text-balance font-heading text-2xl font-bold tracking-tight md:text-3xl";

type Props = {
  id: string;
  title: string;
  link?: { href: string; label: string };
};

/** Homepage section header: Onest H2 + one "see all" link style for every section. */
export function SectionHeading({ id, title, link }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className={sectionTitleClass}>
        {title}
      </h2>
      {link && <SeeAllLink href={link.href} label={link.label} />}
    </div>
  );
}

export function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary hover:underline"
    >
      {label}
      <ArrowRight
        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden
      />
    </Link>
  );
}
