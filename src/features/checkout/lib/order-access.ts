import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { safeCompare } from "@/lib/timing-safe-equal";

// Order numbers are sequential, so the confirmation page can't be public.
// The browser that placed the order gets a signed cookie scoped to that page.
const ACCESS_TTL_DAYS = 30;

function confirmationPath(orderNumber: string): string {
  return `/zamowienie/potwierdzenie/${orderNumber}`;
}

function sign(orderNumber: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`order-access:${orderNumber}`).digest("base64url");
}

export async function grantOrderAccess(orderNumber: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`order_${orderNumber}`, sign(orderNumber), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: confirmationPath(orderNumber),
    maxAge: ACCESS_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function hasOrderAccess(orderNumber: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`order_${orderNumber}`)?.value;
  return !!token && safeCompare(token, sign(orderNumber));
}
