import { prisma } from "@/lib/prisma";

export async function getCartForCheckout(cartId: string) {
  return prisma.cart.findFirst({
    where: {
      id: cartId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          variantId: true,
          quantity: true,
          giftSetGroupId: true,
          giftSetId: true,
          giftSetLabel: true,
          packagingId: true,
          packagingLabel: true,
          giftMessage: true,
          unitPriceOverridePln: true,
          variant: {
            select: {
              id: true,
              sku: true,
              pricePln: true,
              vatRate: true,
              optionValue: true,
              stock: true,
              product: { select: { namePl: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type CheckoutCart = NonNullable<Awaited<ReturnType<typeof getCartForCheckout>>>;
export type CheckoutCartItem = CheckoutCart["items"][number];

/** Per-unit price to charge — the gift-set allocation if set, else the variant's own price. */
export function checkoutItemUnitPricePln(item: CheckoutCartItem): number {
  return item.unitPriceOverridePln ?? item.variant.pricePln;
}
