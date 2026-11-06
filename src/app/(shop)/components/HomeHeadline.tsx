/** The page's one H1 as a slim line, so the first shelf starts right under it.
 * No need links here: the tabs below and "Czego szukasz?" already offer them. */
export function HomeHeadline() {
  return (
    <div className="min-w-0">
      <h1
        id="home-h1"
        className="text-balance font-heading text-xl font-extrabold leading-tight tracking-[-0.02em] sm:text-2xl md:text-3xl"
      >
        Suplementy diety, witaminy i zioła
      </h1>
      <p className="mt-0.5 text-muted-foreground max-sm:hidden">
        Ponad 1300 produktów z pełnym składem.
      </p>
    </div>
  );
}
