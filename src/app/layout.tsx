import type { Metadata, Viewport } from "next";
import { Geist_Mono, Onest, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { CookieBanner } from "@/components/CookieBanner";
import { Toaster } from "@/components/ui/sonner";
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
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
          <Toaster />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
