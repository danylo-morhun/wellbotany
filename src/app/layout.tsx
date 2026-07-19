import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
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

export const metadata: Metadata = {
  title: {
    default: "Twoje Zdrowie — Suplementy i produkty bio",
    template: "%s | Twoje Zdrowie",
  },
  description:
    "Sklep z suplementami diety, witaminami i produktami bio. Szeroki wybór, szybka dostawa InPost i DHL.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://twojezdrowie.pl"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pl"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
          <Toaster />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
