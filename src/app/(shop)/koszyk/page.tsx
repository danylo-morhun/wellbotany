import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { CartList } from "@/features/cart/components/CartList";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { ShippingProgress } from "@/features/cart/components/ShippingProgress";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import { CART_COOKIE_NAME, getCart, getCartByCustomerId } from "@/features/cart/lib/session";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Koszyk — Well Botany",
};

export default async function KoszykPage() {
  const session = await auth();
  let cart = null;

  if (session?.user?.id) {
    cart = await getCartByCustomerId(session.user.id);
  } else {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    cart = cartId ? await getCart(cartId) : null;
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-9 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Twój koszyk jest pusty</h1>
            <p className="text-muted-foreground">Przejrzyj katalog i dodaj produkty do koszyka.</p>
          </div>
          <Link
            href="/katalog"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Przejdź do katalogu
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + effectiveUnitPricePln(item) * item.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Koszyk{" "}
          <span className="text-lg font-normal text-muted-foreground">
            ({items.reduce((s, i) => s + i.quantity, 0)}{" "}
            {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "produkt" : "produkty"})
          </span>
        </h1>
        <Link
          href="/katalog"
          className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          Kontynuuj zakupy
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-card">
            <CartList items={items} />
          </div>
          <ShippingProgress subtotal={subtotal} />
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}
