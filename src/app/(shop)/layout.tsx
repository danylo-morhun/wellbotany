import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";
import { NewsletterPrompt } from "@/features/newsletter/components/NewsletterPrompt";
import { StorefrontSessionProvider } from "@/features/session/components/StorefrontSessionProvider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <StorefrontSessionProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-float focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Przejdź do treści
      </a>
      <NavBar />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <NewsletterPrompt />
    </StorefrontSessionProvider>
  );
}
