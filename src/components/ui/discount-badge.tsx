import { cn } from "@/lib/utils";

type Props = {
  percent: number;
  /**
   * corner — a tab set into the top-left corner of a photo (the photo's box needs
   * `relative overflow-hidden`); inline — a compact label next to a price
   */
  variant?: "corner" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Orange stays promo-only (DESIGN.md §2); the true minus sign reads as a reduction
export function DiscountBadge({ percent, variant = "inline", size = "sm", className }: Props) {
  const label = `−${percent}%`;
  if (variant === "corner") {
    return (
      <span
        className={cn(
          "absolute left-0 top-0 z-10 bg-accent font-extrabold leading-none text-accent-foreground tabular-nums",
          size === "lg"
            ? "rounded-br-2xl px-4 py-3 text-lg sm:px-5 sm:text-xl"
            : "rounded-br-xl px-3 py-2 text-sm",
          className,
        )}
      >
        <span className="sr-only">Promocja </span>
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-block rounded-md bg-accent font-extrabold leading-none text-accent-foreground tabular-nums",
        size === "md" ? "px-2 py-1.5 text-sm" : "px-1.5 py-1 text-xs",
        className,
      )}
    >
      {label}
    </span>
  );
}
