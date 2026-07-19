import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://cdn.baselinker.com https://zielarniakaliska.com.pl https://yango.pl https://kenay.com.pl",
    // 'strict-dynamic' trusts scripts loaded by an already-nonce'd script (e.g. the
    // Cloudinary upload widget, which our own JS injects) — the explicit host below
    // is a fallback for older browsers that don't support strict-dynamic.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://upload-widget.cloudinary.com`,
    // No nonce equivalent exists for inline style="..." attributes (only <style>
    // blocks), and Radix/base-ui set inline styles for positioning — unsafe-inline
    // here is a deliberate, lower-severity tradeoff.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io",
    "frame-src https://upload-widget.cloudinary.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default auth((req) => {
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

  // Dev's Fast Refresh needs eval() and doesn't need CSP enforced locally.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
