import type { OrderStatus } from "@prisma/client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_TONE, orderStatusLabel } from "@/features/orders/lib/status-labels";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  meta,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
            {meta}
          </div>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl bg-card shadow-card", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cn("p-5", title && "pt-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function OrderStatusBadge({
  status,
  shippingMethod,
}: {
  status: OrderStatus;
  shippingMethod: string;
}) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} dot>
      {orderStatusLabel(status, shippingMethod)}
    </Badge>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** Shared dense-table classes so every admin list reads the same */
export const table = {
  wrap: "overflow-x-auto rounded-2xl bg-card shadow-card",
  table: "w-full text-sm",
  thead: "sticky top-0 z-10 border-b border-border bg-card text-left text-xs text-muted-foreground",
  th: "h-10 px-4 font-medium whitespace-nowrap",
  tr: "border-b border-border/70 last:border-0 transition-colors hover:bg-muted/40 motion-reduce:transition-none",
  td: "h-12 px-4",
};

// Server components render on UTC hosts — pin admin dates to the shop's zone
export const SHOP_TZ = "Europe/Warsaw";

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: SHOP_TZ });

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pl-PL", {
    timeZone: SHOP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeDate(date: Date, now = new Date()): string {
  const diffMin = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  const time = date.toLocaleTimeString("pl-PL", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dayKey(date) === dayKey(now)) return `dziś, ${time}`;
  if (dayKey(date) === dayKey(new Date(now.getTime() - 86400000))) return `wczoraj, ${time}`;
  return date.toLocaleDateString("pl-PL", {
    timeZone: SHOP_TZ,
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
