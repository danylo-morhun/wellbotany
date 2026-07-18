"use server";

import { revalidatePath } from "next/cache";
import { ensureCartId } from "@/features/cart/lib/session";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { actionClient, adminActionClient } from "@/lib/safe-action";
import {
  allocateGiftBoxPrice,
  DEFAULT_GIFT_BUILDER_POLICY,
  giftBuilderTargetTotalPln,
} from "./lib/pricing";
import {
  addCuratedGiftSetToCartSchema,
  addCustomGiftSetToCartSchema,
  deleteGiftPackagingSchema,
  deleteGiftSetSchema,
  giftBuilderSettingsSchema,
  giftPackagingSchema,
  giftSetSchema,
  searchVariantsSchema,
} from "./schema";

// ─── Admin: curated gift sets ──────────────────────────────────────────────────

export const searchVariantsForGiftSet = adminActionClient
  .schema(searchVariantsSchema)
  .action(async ({ parsedInput: { query } }) => {
    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { status: "ACTIVE" },
        OR: [
          { sku: { contains: query, mode: "insensitive" } },
          { product: { namePl: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        sku: true,
        pricePln: true,
        optionValue: true,
        product: { select: { namePl: true } },
      },
      orderBy: { product: { namePl: "asc" } },
      take: 20,
    });
    return variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      pricePln: v.pricePln,
      optionValue: v.optionValue,
      productName: v.product.namePl,
    }));
  });

export const saveGiftSet = adminActionClient
  .schema(giftSetSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, items, imageUrl, nameEn, nameUk, descriptionPl, comparePricePln, ...data } = input;
    const payload = {
      ...data,
      imageUrl: imageUrl || null,
      nameEn: nameEn || null,
      nameUk: nameUk || null,
      descriptionPl: descriptionPl || null,
      comparePricePln: comparePricePln ?? null,
    };

    const savedId = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.giftSet.update({
          where: { id },
          data: {
            ...payload,
            items: {
              deleteMany: {},
              create: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            },
          },
        });
        return id;
      }
      const created = await tx.giftSet.create({
        data: {
          ...payload,
          items: {
            create: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          },
        },
        select: { id: true },
      });
      return created.id;
    });

    revalidatePath("/admin/zestawy-prezentowe");
    revalidatePath("/zestawy-prezentowe", "layout");
    return { success: true, id: savedId };
  });

export const deleteGiftSet = adminActionClient
  .schema(deleteGiftSetSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.giftSet.delete({ where: { id } });
    revalidatePath("/admin/zestawy-prezentowe");
    revalidatePath("/zestawy-prezentowe", "layout");
    return { success: true };
  });

// ─── Admin: custom builder policy ──────────────────────────────────────────────

export const saveGiftBuilderSettings = adminActionClient
  .schema(giftBuilderSettingsSchema)
  .action(async ({ parsedInput: input }) => {
    await prisma.giftBuilderSettings.upsert({
      where: { id: 1 },
      update: { ...input, boxPricePln: input.boxPricePln ?? null },
      create: { id: 1, ...input, boxPricePln: input.boxPricePln ?? null },
    });
    revalidatePath("/admin/zestawy-prezentowe/ustawienia");
    revalidatePath("/zestawy-prezentowe/stworz");
    return { success: true };
  });

// ─── Admin: packaging options ──────────────────────────────────────────────────

export const saveGiftPackaging = adminActionClient
  .schema(giftPackagingSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, imageUrl, ...data } = input;
    const payload = { ...data, imageUrl: imageUrl || null };
    if (id) {
      await prisma.giftPackaging.update({ where: { id }, data: payload });
    } else {
      await prisma.giftPackaging.create({ data: payload });
    }
    revalidatePath("/admin/zestawy-prezentowe/opakowania");
    revalidatePath("/zestawy-prezentowe/stworz");
    return { success: true };
  });

export const deleteGiftPackaging = adminActionClient
  .schema(deleteGiftPackagingSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.giftPackaging.delete({ where: { id } });
    revalidatePath("/admin/zestawy-prezentowe/opakowania");
    revalidatePath("/zestawy-prezentowe/stworz");
    return { success: true };
  });

// ─── Customer: add to cart ──────────────────────────────────────────────────────

export const addCuratedGiftSetToCart = actionClient
  .schema(addCuratedGiftSetToCartSchema)
  .action(async ({ parsedInput: { giftSetId } }) => {
    const giftSet = await prisma.giftSet.findUnique({
      where: { id: giftSetId, status: "ACTIVE" },
      include: { items: { include: { variant: { select: { pricePln: true, stock: true } } } } },
    });
    if (!giftSet) throw new ActionError("Zestaw nie jest dostępny");

    for (const item of giftSet.items) {
      if (item.variant.stock < item.quantity) {
        throw new ActionError("Jeden z produktów w zestawie jest niedostępny");
      }
    }

    const { lines } = allocateGiftBoxPrice(
      giftSet.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPricePln: i.variant.pricePln,
      })),
      giftSet.pricePln,
    );

    const cartId = await ensureCartId();
    const groupId = crypto.randomUUID();

    await prisma.cartItem.createMany({
      data: lines.map((l) => ({
        cartId,
        variantId: l.variantId,
        quantity: l.quantity,
        giftSetGroupId: groupId,
        giftSetId: giftSet.id,
        giftSetLabel: `Zestaw: ${giftSet.namePl}`,
        unitPriceOverridePln: l.unitPriceOverridePln,
      })),
    });

    revalidatePath("/", "layout");
    return { success: true };
  });

export const addCustomGiftSetToCart = actionClient
  .schema(addCustomGiftSetToCartSchema)
  .action(async ({ parsedInput: { items, packagingId, giftMessage } }) => {
    const savedSettings = await prisma.giftBuilderSettings.findUnique({ where: { id: 1 } });
    const settings = savedSettings ?? DEFAULT_GIFT_BUILDER_POLICY;
    if (!settings.isActive) {
      throw new ActionError("Kreator zestawów jest obecnie niedostępny");
    }

    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    if (totalQuantity < settings.minItems || totalQuantity > settings.maxItems) {
      throw new ActionError(`Wybierz od ${settings.minItems} do ${settings.maxItems} produktów`);
    }

    const packaging = await prisma.giftPackaging.findUnique({
      where: { id: packagingId, isActive: true },
    });
    if (!packaging) throw new ActionError("Wybrane opakowanie nie jest już dostępne");

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: items.map((i) => i.variantId) },
        isActive: true,
        product: { isGiftEligible: true, status: "ACTIVE" },
      },
      select: { id: true, pricePln: true, stock: true },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    for (const item of items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) throw new ActionError("Wybrany produkt nie jest już dostępny do zestawu");
      if (variant.stock < item.quantity) {
        throw new ActionError("Jeden z wybranych produktów jest niedostępny w tej ilości");
      }
    }

    const components = items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
      unitPricePln: variantMap.get(i.variantId)!.pricePln,
    }));

    const target = giftBuilderTargetTotalPln(settings, components) + packaging.extraPricePln;
    const { lines } = allocateGiftBoxPrice(components, target);

    const cartId = await ensureCartId();
    const groupId = crypto.randomUUID();

    await prisma.cartItem.createMany({
      data: lines.map((l) => ({
        cartId,
        variantId: l.variantId,
        quantity: l.quantity,
        giftSetGroupId: groupId,
        giftSetId: null,
        giftSetLabel: settings.namePl,
        unitPriceOverridePln: l.unitPriceOverridePln,
        packagingId: packaging.id,
        packagingLabel: packaging.namePl,
        giftMessage: giftMessage || null,
      })),
    });

    revalidatePath("/", "layout");
    return { success: true };
  });
