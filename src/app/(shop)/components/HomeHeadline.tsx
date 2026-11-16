/** The page's one H1 as a slim line, so the first shelf starts right under it.
 * No need links here: the tabs below and "Czego szukasz?" already offer them. */
export function HomeHeadline({ productCount }: { productCount: number }) {
  // Rounded down, so "ponad" stays true between cache refreshes
  const shown = Math.floor(productCount / 100) * 100;
  return (
    <div className="min-w-0">
      <h1
        id="home-h1"
        className="text-balance font-heading text-xl font-extrabold leading-tight tracking-[-0.02em] sm:text-2xl md:text-3xl"
      >
        Suplementy diety, zioła i zdrowa żywność
      </h1>
      <p className="mt-0.5 text-muted-foreground max-sm:hidden">
        {shown >= 100 ? `Ponad ${shown} produktów` : "Produkty"} z pełnym składem: od witamin po
        czekoladę, przekąski i kawę.
      </p>
    </div>
  );
}
