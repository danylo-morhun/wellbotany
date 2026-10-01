import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { AdminSidebarNav } from "@/app/admin/components/shell/AdminSidebar";
import { AdminTopbar } from "@/app/admin/components/shell/AdminTopbar";
import { AdminUserMenu } from "@/app/admin/components/shell/AdminUserMenu";
import { CommandPalette } from "@/app/admin/components/shell/CommandPalette";
import type { NavBadges } from "@/app/admin/components/shell/nav";
import { TO_PACK_STATUSES } from "@/features/orders/lib/status-labels";
import { lowStockWhere } from "@/features/products/lib/stock";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Panel admina", template: "%s · Admin | Well Botany" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Strict CSP (src/proxy.ts) nonces scripts per request; a prerendered page has
  // no nonce on its script tags, so the browser blocks them and nothing hydrates
  await connection();
  const [session, toPack, lowStock, reviews, messages] = await Promise.all([
    auth(),
    prisma.order.count({ where: { status: { in: TO_PACK_STATUSES } } }),
    prisma.productVariant.count({ where: lowStockWhere }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  const badges: NavBadges = { orders: toPack, lowStock, reviews, messages };

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/logowanie" });
  }
  const userMenu = (
    <AdminUserMenu
      name={session?.user?.name ?? "Admin"}
      email={session?.user?.email ?? ""}
      logout={logout}
    />
  );

  return (
    <div className="flex min-h-dvh flex-1 bg-sidebar print:bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto px-3 py-4 lg:flex print:hidden">
        <Link
          href="/admin"
          className="mb-6 flex items-center gap-2 px-2.5 font-heading text-lg font-semibold tracking-tight"
        >
          <Image
            src="/branding/logo-mark.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
            unoptimized
          />
          Well Botany
        </Link>
        <AdminSidebarNav badges={badges} />
        <div className="mt-auto pt-4">{userMenu}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-background lg:my-2 lg:mr-2 lg:rounded-2xl lg:shadow-card print:m-0 print:shadow-none">
        <AdminTopbar badges={badges} userMenu={userMenu} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
