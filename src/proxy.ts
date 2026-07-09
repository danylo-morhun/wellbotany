import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/konto/:path*", "/admin/:path*"],
};

