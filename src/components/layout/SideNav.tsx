"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SideNavItem = {
  href: string;
  label: string;
  badge?: number | null;
};

type Props = {
  items: SideNavItem[];
};

export function SideNav({ items }: Props) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-150 motion-reduce:transition-none ${
              isActive
                ? "bg-secondary font-semibold text-primary-ink"
                : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
            {item.badge != null && (
              <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
