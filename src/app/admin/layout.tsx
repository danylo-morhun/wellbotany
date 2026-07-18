import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SideNav } from "@/components/layout/SideNav";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const lowStockCount = await prisma.productVariant.count({
    where: { stock: { lte: 5, gt: 0 }, trackStock: true },
  });

  const navItems = [
    { href: "/admin/zamowienia", label: "Zamówienia", badge: null },
    { href: "/admin/produkty", label: "Produkty", badge: null },
    { href: "/admin/naborys", label: "Zestawy prezentowe", badge: null },
    { href: "/admin/magazyn", label: "Magazyn", badge: lowStockCount > 0 ? lowStockCount : null },
    { href: "/admin/kategorie", label: "Kategorie", badge: null },
    { href: "/admin/marki", label: "Marki", badge: null },
    { href: "/admin/tagi", label: "Tagi", badge: null },
  ];

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="mb-2 px-3.5 pt-1 text-sm font-bold text-foreground">Panel admina</p>
            <nav className="flex flex-col gap-0.5">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
              >
                <ArrowLeft className="size-3.5" />
                Wróć do sklepu
              </Link>
              <div className="mx-1 my-1 border-t border-border" />
              <SideNav items={navItems} />
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
