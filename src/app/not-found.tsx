import { Search } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-16 text-center">
        <p aria-hidden className="text-7xl font-extrabold tracking-tight text-primary/20">
          404
        </p>
        <h1 className="mt-4 text-2xl">Nie znaleziono strony</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
          >
            Strona główna
          </Link>
          <Link
            href="/katalog"
            className="flex items-center gap-2 rounded-full bg-secondary px-7 py-3 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
          >
            <Search className="size-4" />
            Przeglądaj katalog
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
