"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { CART_COOKIE_NAME } from "@/features/cart/lib/session";
import { paymentUrl, registerTransaction } from "@/features/przelewy24/lib/client";
import { isP24Enabled } from "@/features/przelewy24/lib/config";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { ActionError } from "@/lib/action-error";
import { auth } from "@/lib/auth";
import { sendOrderConfirmationEmail } from "@/lib/email/order-emails";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  assertNotRateLimited,
  checkoutLimiter,
  couponLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { checkoutItemUnitPricePln, getCartForCheckout } from "./lib/cart";
import { grantOrderAccess } from "./lib/order-access";
import { isOfflinePayment } from "./lib/payment";
import { requiresAddress, requiresPickupPoint, shippingCostFor } from "./lib/shipping";
import { checkoutSchema } from "./schema";

export const verifyCoupon = actionClient
  .schema(z.object({ code: z.string().min(1), subtotal: z.number().int() }))
  .action(async ({ parsedInput: { code, subtotal } }) => {
    await assertNotRateLimited(couponLimiter, await getClientIp());

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
        ],
      },
      select: {
        id: true,
        type: true,
        value: true,
        minOrderPln: true,
        maxUsages: true,
        usageCount: true,
      },
    });

    if (!coupon) {
      return { valid: false as const, discountPln: 0, message: "Nieprawidłowy lub wygasły kod" };
    }
    if (coupon.maxUsages !== null && coupon.usageCount >= coupon.maxUsages) {
      return { valid: false as const, discountPln: 0, message: "Kod rabatowy jest już wyczerpany" };
    }
    if (coupon.minOrderPln !== null && subtotal < coupon.minOrderPln) {
      return {
        valid: false as const,
        discountPln: 0,
        message: `Minimalna wartość zamówienia: ${formatPrice(coupon.minOrderPln)}`,
      };
    }

    const discountPln =
      coupon.type === "PERCENTAGE"
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(coupon.value, subtotal);

    return { valid: true as const, discountPln, message: null };
  });

// Online methods stay in the shared enum; the server rejects them while P24 is off.
const placeOrderSchema = checkoutSchema.superRefine((data, ctx) => {
  if (!isP24Enabled() && !isOfflinePayment(data.paymentMethod)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Płatności online są chwilowo niedostępne — wybierz przelew tradycyjny",
      path: ["paymentMethod"],
    });
  }
});

export const placeOrder = actionClient
  .schema(placeOrderSchema)
  .action(async ({ parsedInput: input }) => {
    await assertNotRateLimited(checkoutLimiter, await getClientIp());

    const session = await auth();
    const cookieStore = await cookies();
    const cart = await getCartForCheckout(input.cartId);
    // cartId comes from the client — only accept the caller's own cart
    const ownsCart = cart?.customerId
      ? cart.customerId === session?.user?.id
      : cart?.id === cookieStore.get(CART_COOKIE_NAME)?.value;
    if (!cart || !ownsCart || cart.items.length === 0) {
      throw new ActionError("Koszyk jest pusty");
    }

    const hasAddress = requiresAddress(input.shippingMethod);
    const hasPickupPoint = requiresPickupPoint(input.shippingMethod);
    const { freeShippingThresholdPln } = await getShopSettings();
    const subtotalPln = cart.items.reduce(
      (sum, item) => sum + checkoutItemUnitPricePln(item) * item.quantity,
      0,
    );

    const taxPln = cart.items.reduce((sum, item) => {
      const itemTotal = checkoutItemUnitPricePln(item) * item.quantity;
      const rate = Number(item.variant.vatRate);
      return sum + Math.round((itemTotal * rate) / (100 + rate));
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      // Atomic order number
      const seq = await tx.orderSequence.upsert({
        where: { id: 1 },
        update: { value: { increment: 1 } },
        create: { id: 1, value: 1 },
        select: { value: true },
      });
      const year = new Date().getFullYear();
      const orderNumber = `TZ-${year}-${String(seq.value).padStart(5, "0")}`;

      // Coupon — all checks + increment inside tx to prevent race conditions
      let discountPln = 0;
      let couponId: string | undefined;
      let couponCode: string | undefined;

      if (input.couponCode?.trim()) {
        const code = input.couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findFirst({
          where: {
            code,
            isActive: true,
            AND: [
              { OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }] },
              { OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] },
            ],
          },
          select: {
            id: true,
            type: true,
            value: true,
            maxUsages: true,
            usageCount: true,
            minOrderPln: true,
          },
        });

        // Customer saw this discount in the summary — don't silently drop it
        if (!coupon) {
          throw new ActionError(
            "Kod rabatowy jest nieprawidłowy lub wygasł. Usuń go i spróbuj ponownie.",
          );
        }

        if (coupon.minOrderPln !== null && subtotalPln < coupon.minOrderPln) {
          throw new ActionError(
            `Minimalna wartość zamówienia dla tego kodu: ${formatPrice(coupon.minOrderPln)}`,
          );
        }

        // Atomic increment — WHERE guards against exceeding maxUsages
        const used = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            OR: [{ maxUsages: null }, { usageCount: { lt: coupon.maxUsages ?? 0 } }],
          },
          data: { usageCount: { increment: 1 } },
        });

        if (used.count === 0) {
          throw new ActionError("Kod rabatowy jest już wyczerpany");
        }

        couponId = coupon.id;
        couponCode = code;
        discountPln =
          coupon.type === "PERCENTAGE"
            ? Math.round((subtotalPln * coupon.value) / 100)
            : Math.min(coupon.value, subtotalPln);
      }

      // Free-delivery threshold applies to the subtotal after discounts
      const shippingPln = shippingCostFor(
        input.shippingMethod,
        subtotalPln - discountPln,
        freeShippingThresholdPln,
      );
      const totalPln = subtotalPln + shippingPln - discountPln;
      const isFree = totalPln === 0;

      // Decrement stock atomically
      for (const item of cart.items) {
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new ActionError(
            `Produkt niedostępny w wybranej ilości: ${item.variant.product.namePl}`,
          );
        }
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: session?.user?.id ?? null,
          // Fully discounted orders need no payment; pay-at-pickup orders are prepared
          // right away; the rest wait for payment
          status: isFree
            ? "PAID"
            : input.paymentMethod === "CASH_ON_DELIVERY"
              ? "PROCESSING"
              : "PAYMENT_PENDING",
          customerEmail: input.email,
          customerPhone: input.phone,
          customerName: `${input.firstName} ${input.lastName}`,
          shippingMethod: input.shippingMethod,
          shippingCostPln: shippingPln,
          shippingPln,
          inpostMachineId: hasPickupPoint ? (input.inpostMachineId ?? null) : null,
          inpostMachineName: hasPickupPoint ? (input.inpostMachineName ?? null) : null,
          pickupLocation: input.shippingMethod === "PICKUP" ? (input.pickupLocation ?? null) : null,
          shipFirstName: input.firstName,
          shipLastName: input.lastName,
          shipStreet: hasAddress ? (input.street ?? null) : null,
          shipApartment: hasAddress ? (input.apartment ?? null) : null,
          shipCity: hasAddress ? (input.city ?? null) : null,
          shipPostalCode: hasAddress ? (input.postalCode ?? null) : null,
          shipCountry: "PL",
          shipPhone: input.phone,
          wantsFaktura: input.wantsFaktura,
          billCompany: input.billCompany ?? null,
          billNip: input.billNip ?? null,
          billStreet: input.billStreet ?? null,
          billCity: input.billCity ?? null,
          billPostalCode: input.billPostalCode ?? null,
          billCountry: input.wantsFaktura ? "PL" : null,
          paymentMethod: input.paymentMethod,
          paymentStatus: isFree ? "CAPTURED" : "PENDING",
          subtotalPln,
          discountPln,
          taxPln,
          totalPln,
          couponId: couponId ?? null,
          couponCode: couponCode ?? null,
          items: {
            create: cart.items.map((item) => {
              const unitPricePln = checkoutItemUnitPricePln(item);
              return {
                variantId: item.variantId,
                productName: item.variant.product.namePl,
                variantOpt: item.variant.optionValue ?? null,
                sku: item.variant.sku,
                quantity: item.quantity,
                unitPricePln,
                vatRate: item.variant.vatRate,
                totalPln: unitPricePln * item.quantity,
                giftSetGroupId: item.giftSetGroupId,
                giftSetId: item.giftSetId,
                giftSetLabel: item.giftSetLabel,
                packagingId: item.packagingId,
                packagingLabel: item.packagingLabel,
                giftMessage: item.giftMessage,
              };
            }),
          },
        },
        select: { orderNumber: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { orderNumber: newOrder.orderNumber, totalPln };
    });

    cookieStore.delete(CART_COOKIE_NAME);
    await grantOrderAccess(order.orderNumber);

    sendOrderConfirmationEmail(order.orderNumber).catch((err) => {
      console.error(`[email] confirmation failed for ${order.orderNumber}:`, err);
    });

    if (
      order.totalPln === 0 ||
      isOfflinePayment(input.paymentMethod) ||
      process.env.P24_SANDBOX_BYPASS === "true"
    ) {
      return { orderNumber: order.orderNumber, redirectUrl: null };
    }

    // Register Przelewy24 transaction
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

    const token = await registerTransaction({
      sessionId: order.orderNumber,
      amount: order.totalPln,
      description: `Zamówienie ${order.orderNumber}`,
      email: input.email,
      urlReturn: `${appUrl}/zamowienie/potwierdzenie/${order.orderNumber}`,
      urlStatus: `${appUrl}/api/p24/notify`,
    });

    return {
      orderNumber: order.orderNumber,
      redirectUrl: paymentUrl(token),
    };
  });
