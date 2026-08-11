import type { Metadata, Viewport } from "next";
import { Geist_Mono, Onest, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { CookieBanner } from "@/components/CookieBanner";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Toaster } from "@/components/ui/sonner";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, toJsonLdScript } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Well Botany — Suplementy i produkty bio",
    template: "%s | Well Botany",
  },
  description:
    "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, szybka dostawa InPost i DHL.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl"),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Well Botany",
    title: "Well Botany — Suplementy i produkty bio",
    description:
      "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, szybka dostawa InPost i DHL.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Well Botany — Suplementy i produkty bio",
    description:
      "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, szybka dostawa InPost i DHL.",
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
          {children}
          <Toaster />
          <CookieBanner />
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
