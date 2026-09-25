import { SideNav } from "@/components/layout/SideNav";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/konto/profil", label: "Profil" },
  { href: "/konto/adresy", label: "Adresy" },
  { href: "/konto/zamowienia", label: "Zamówienia" },
];

export default function KontoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <div className="rounded-2xl bg-card p-3 shadow-card">
            <p className="mb-2 px-3.5 pt-1 text-sm font-bold text-foreground">Moje konto</p>
            <nav className="flex flex-col gap-0.5">
              <SideNav items={NAV_ITEMS} />
              <LogoutButton
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              />
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
