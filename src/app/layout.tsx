import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { CookieBanner } from "@/components/CookieBanner";
import { GoogleTag } from "@/components/GoogleTag";
import { MetaClickId } from "@/components/MetaClickId";
import { Toaster } from "@/components/ui/sonner";
import { COOKIE_CONSENT_BOOT_SCRIPT } from "@/lib/cookie-consent-script";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  DEFAULT_OG_IMAGE,
  toJsonLdScript,
} from "@/lib/seo";
import "./globals.css";

// Self-hosted variable fonts (latin + latin-ext), see ./fonts/README.md
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans.woff2",
  variable: "--font-sans",
  weight: "400 800",
});

const geistMono = localFont({
  src: "./fonts/GeistMono.woff2",
  variable: "--font-mono",
  weight: "100 900",
  // Admin-only (SKUs, tables) — don't preload it on every storefront page
  preload: false,
});

const onest = localFont({
  src: "./fonts/Onest.woff2",
  variable: "--font-display",
  weight: "500 700",
  // Headings only — a preload competes with CSS and the LCP image; swap is fine
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Well Botany — Suplementy i produkty bio",
    template: "%s | Well Botany",
  },
  description:
    "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, wysyłka do paczkomatu, punktu odbioru lub kurierem.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl"),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Well Botany",
    title: "Well Botany — Suplementy i produkty bio",
    description:
      "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, wysyłka do paczkomatu, punktu odbioru lub kurierem.",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Well Botany — Suplementy i produkty bio",
    description:
      "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, wysyłka do paczkomatu, punktu odbioru lub kurierem.",
    images: [DEFAULT_OG_IMAGE.url],
  },
  verification: {
    google: "8H41cB23kzb36R1T4wR4A_oz4zVtbQGdKUq6Nl5AqsQ",
  },
  icons: {
    icon: [
      {
        url: "/branding/logo-mark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/branding/logo-mark-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#07674A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${jakarta.variable} ${geistMono.variable} ${onest.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static string, no user input
          dangerouslySetInnerHTML={{ __html: COOKIE_CONSENT_BOOT_SCRIPT }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(buildOrganizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(buildWebsiteJsonLd()) }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {/* Early in DOM order so keyboard users reach it first; it's fixed, so layout is unchanged */}
          <CookieBanner />
          {children}
          <Toaster />
        </ThemeProvider>
        <GoogleTag />
        <MetaClickId />
      </body>
    </html>
  );
}
