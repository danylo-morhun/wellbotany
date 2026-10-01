"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_GROUPS, type NavBadges } from "./nav";

type Props = {
  badges: NavBadges;
  onNavigate?: () => void;
};

export function AdminSidebarNav({ badges, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel admina" className="flex flex-col gap-5">
      {NAV_GROUPS.map((group, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static config, some groups have no label
        <div key={i} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="mb-1 px-2.5 text-xs font-medium text-muted-foreground/80">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isNavActive(pathname, item.href);
            const count = item.badge ? badges[item.badge] : undefined;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150 motion-reduce:transition-none",
                  active
                    ? "bg-card font-semibold text-foreground shadow-card"
                    : "font-medium text-muted-foreground hover:bg-card/70 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                  aria-hidden
                />
                <span className="flex-1 truncate">{item.label}</span>
                {count ? (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums leading-5",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
