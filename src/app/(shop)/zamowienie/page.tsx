import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import { CART_COOKIE_NAME, getCart, getCartByCustomerId } from "@/features/cart/lib/session";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Zamówienie — Twoje Zdrowie",
};

export default async function ZamowieniePage() {
  const session = await auth();
  let cart = null;
  let cartId: string | undefined;

  if (session?.user?.id) {
    cart = await getCartByCustomerId(session.user.id);
    cartId = cart?.id;
  } else {
    const cookieStore = await cookies();
    cartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    cart = cartId ? await getCart(cartId) : null;
  }

  const items = cart?.items ?? [];

  if (!cartId || items.length === 0) {
    redirect("/koszyk");
  }

  const subtotal = items.reduce(
    (sum, item) => sum + effectiveUnitPricePln(item) * item.quantity,
    0,
  );

  const defaultAddress = session?.user?.id
    ? await prisma.address.findFirst({
        where: { customerId: session.user.id, isDefault: true },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          street: true,
          apartment: true,
          city: true,
          postalCode: true,
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:max-w-5xl lg:px-8">
      <h1 className="mb-8 text-balance text-2xl">Zamówienie</h1>
      <CheckoutForm
        cartId={cartId}
        items={items}
        subtotal={subtotal}
        initialContact={{
          email: session?.user?.email ?? "",
          firstName: defaultAddress?.firstName ?? "",
          lastName: defaultAddress?.lastName ?? "",
          phone: defaultAddress?.phone ?? "",
          street: defaultAddress?.street ?? "",
          apartment: defaultAddress?.apartment ?? "",
          city: defaultAddress?.city ?? "",
          postalCode: defaultAddress?.postalCode ?? "",
        }}
      />
    </div>
  );
}
