import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";
import { StorefrontSessionProvider } from "@/features/session/components/StorefrontSessionProvider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <StorefrontSessionProvider>
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </StorefrontSessionProvider>
  );
}
