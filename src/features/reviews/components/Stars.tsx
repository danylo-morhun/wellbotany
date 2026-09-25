import { Star } from "lucide-react";

type Props = { rating: number; className?: string };

/** Read-only 0–5 stars (half values round to the nearest whole star). */
export function Stars({ rating, className = "size-4" }: Props) {
  const full = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Ocena ${rating} na 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`${className} ${i <= full ? "fill-accent text-accent" : "text-border"}`}
        />
      ))}
    </span>
  );
}
