import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { THEME_INIT_SCRIPT_HASH } from "@/lib/theme-script";

// Routes that are already per-request dynamic (session, cart, checkout) — a
// per-request nonce costs nothing extra there, so they keep the strictest
// script-src. Everything else stays static/ISR-eligible, which a per-request
// nonce would otherwise force into full dynamic rendering (see root layout).
const STRICT_CSP_PATHS = [
  "/koszyk",
  "/konto",
  "/zamowienie",
  "/logowanie",
  "/rejestracja",
  "/ulubione",
  "/admin",
];

function isStrictCspPath(pathname: string): boolean {
  return STRICT_CSP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Keep in sync with images.remotePatterns in next.config.ts — a host allowed
// there but missing here loads fine in <Image> but gets silently blocked by
// the browser's CSP, so the img falls back to alt text.
const IMG_SRC_HOSTS = [
  "https://res.cloudinary.com",
  "https://dcu4fybzavbhk0mv.public.blob.vercel-storage.com",
  "https://images.unsplash.com",
  "https://cdn.baselinker.com",
  "https://zielarniakaliska.com.pl",
  // kenay.com.pl: ~43 products still point here — their catalog pages 404'd
  // before the Blob migration could fetch them, so the old (dead) URL is
  // still in the DB. Keep allowed until those are fixed manually.
  "https://kenay.com.pl",
].join(" ");

// Furgonetka pickup-point map on checkout: its script pulls maplibre + a scrollbar
// lib from CDNs, Google Fonts, vector tiles/glyphs from c.furgonetka.pl, point
// data from api.furgonetka.pl, and runs maplibre's worker from a blob: URL.
// Scripts need no host entries — they're injected by our nonce'd bundle, which
// 'strict-dynamic' trusts.
// Google Analytics 4 — loaded only after cookie consent (GoogleAnalytics.tsx)
const GA_CONNECT =
  "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com";

const POINT_MAP_CSP = {
  img: "https://furgonetka.pl https://c.furgonetka.pl",
  style: "https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com",
  font: "https://fonts.gstatic.com",
  connect: "https://furgonetka.pl https://api.furgonetka.pl https://c.furgonetka.pl",
};

function buildStrictCsp(nonce: string, withPointMap: boolean): string {
  const map = (hosts: string) => (withPointMap ? ` ${hosts}` : "");
  return [
    "default-src 'self'",
    `img-src 'self' data: blob: ${IMG_SRC_HOSTS}${map(POINT_MAP_CSP.img)}`,
    // 'strict-dynamic' trusts scripts loaded by an already-nonce'd script
    // (e.g. Google Analytics' gtag.js pulling in further tag scripts).
    `script-src 'self' 'nonce-${nonce}' '${THEME_INIT_SCRIPT_HASH}' 'strict-dynamic'`,
    // No nonce equivalent exists for inline style="..." attributes (only <style>
    // blocks), and Radix/base-ui set inline styles for positioning — unsafe-inline
    // here is a deliberate, lower-severity tradeoff.
    `style-src 'self' 'unsafe-inline'${map(POINT_MAP_CSP.style)}`,
    `font-src 'self'${map(POINT_MAP_CSP.font)}`,
    `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io ${GA_CONNECT}${map(POINT_MAP_CSP.connect)}`,
    ...(withPointMap ? ["worker-src 'self' blob:"] : []),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// No nonce here on purpose — a per-request nonce is itself a dynamic value,
// and reading it in the root layout would force every public storefront page
// into dynamic rendering. 'unsafe-inline' is the deliberate tradeoff that
// keeps home/katalog/produkt static-/ISR-eligible; next-themes' inline
// theme-init script runs fine under it (it only sets a class, not a security
// boundary), same for Next's own hydration bootstrap scripts.
function buildRelaxedCsp(): string {
  return [
    "default-src 'self'",
    `img-src 'self' data: blob: ${IMG_SRC_HOSTS}`,
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    // Cloudinary too: a client-side nav from the storefront into /admin keeps
    // this document's CSP, so the admin image upload runs under it.
    `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io ${GA_CONNECT}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function withCsp(req: NextRequest): NextResponse {
  // Dev's Fast Refresh needs eval() and doesn't need CSP enforced locally.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  if (!isStrictCspPath(req.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", buildRelaxedCsp());
    return response;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildStrictCsp(nonce, req.nextUrl.pathname === "/zamowienie");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

const guardedProxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isKonto = req.nextUrl.pathname.startsWith("/konto");
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");

  if (isKonto && !isLoggedIn) {
    const loginUrl = new URL("/logowanie", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && req.auth?.user?.role !== "ADMIN") {
    const loginUrl = new URL("/logowanie", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withCsp(req);
});

// The auth wrapper sets Auth.js cookies on every response it handles, which
// makes CDNs skip caching — so only the guarded sections go through it and
// public storefront pages stay cacheable.
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/konto") || pathname.startsWith("/admin")) {
    // Auth.js types the 2nd arg for route handlers; here it only forwards it
    // to the callback above, which doesn't use it.
    return guardedProxy(req, event as never);
  }
  return withCsp(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
