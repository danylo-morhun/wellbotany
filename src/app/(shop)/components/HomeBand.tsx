import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Mint (bg-secondary) bands alternate with plain ones for page rhythm (DESIGN.md §5) */
  tone?: "plain" | "mint";
  className?: string;
};

/** Full-bleed homepage band; the content sits in the page container. */
export function HomeBand({ children, tone = "plain", className }: Props) {
  return (
    // A section that renders nothing (no posts, no brands…) takes its band's padding with it
    <div className={cn("[&:not(:has(section))]:hidden", tone === "mint" && "bg-secondary")}>
      <div className={cn("container mx-auto px-4", className)}>{children}</div>
    </div>
  );
}
