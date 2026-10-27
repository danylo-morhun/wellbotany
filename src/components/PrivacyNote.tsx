import Link from "next/link";
import type { ReactNode } from "react";
import { SELLER } from "@/lib/seller";

/**
 * First layer of the RODO art. 13 notice, shown where a form collects data
 * (EDPB/WP29 transparency guidelines: layered notice at the point of collection).
 * The privacy policy is the second layer.
 */
export function PrivacyNote({
  purpose,
  consent = false,
  className = "max-w-prose text-xs text-muted-foreground",
  linkClassName = "underline hover:text-foreground",
}: {
  /** What the data is for, as a sentence: "Dane przetwarzamy, aby …" */
  purpose: ReactNode;
  /** Processing is based on consent — mention it can be withdrawn */
  consent?: boolean;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <p className={className}>
      Administratorem danych jest {SELLER.shortName}, {SELLER.address}. {purpose} Masz prawo dostępu
      do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, sprzeciwu
      {consent ? ", wycofania zgody w każdej chwili" : ""} oraz skargi do Prezesa UODO. Więcej w{" "}
      {/* New tab: every form this note sits in would lose what was typed */}
      <Link
        href="/polityka-prywatnosci"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        polityce prywatności
        <span className="sr-only"> (otwiera się w nowej karcie)</span>
      </Link>
      .
    </p>
  );
}
