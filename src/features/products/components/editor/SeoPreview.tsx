const SUFFIX = " | Well Botany";
const MAX_TITLE = 60;

/** Mirrors the storefront's generateMetadata so the preview matches what Google gets */
export function SeoPreview({
  slug,
  title,
  description,
  pathLabel = "produkt",
}: {
  slug: string;
  title: string;
  description: string;
  pathLabel?: string;
}) {
  const clean = title.replace(/\s*[|–—-]\s*Well Botany\s*$/i, "").trim();
  const full = clean.length + SUFFIX.length <= MAX_TITLE ? `${clean}${SUFFIX}` : clean;
  const shownTitle = full.length > MAX_TITLE ? `${full.slice(0, MAX_TITLE - 1)}…` : full;
  const shownDesc = description.length > 160 ? `${description.slice(0, 157)}…` : description;
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">Podgląd w Google</p>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
          WB
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm">Well Botany</p>
          <p className="truncate text-xs text-muted-foreground">
            https://wellbotany.pl › {pathLabel} › {slug || "…"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
        {shownTitle || "Tytuł strony"}
      </p>
      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
        {shownDesc || "Brak opisu — Google wybierze fragment strony sam."}
      </p>
    </div>
  );
}
