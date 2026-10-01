"use server";

import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { adminSearchSchema } from "./schema";

const LIMIT = 6;

/** Command-palette search across orders, products (name/SKU/EAN) and customers. */
export const adminSearch = adminActionClient
  .schema(adminSearchSchema)
  .action(async ({ parsedInput: { query } }) => {
    const contains = { contains: query, mode: "insensitive" as const };
    const [orders, products, accounts, buyers] = await Promise.all([
      prisma.order.findMany({
        where: {
          OR: [{ orderNumber: contains }, { customerEmail: contains }, { customerName: contains }],
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          totalPln: true,
          status: true,
          shippingMethod: true,
        },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { namePl: contains },
            { variants: { some: { OR: [{ sku: contains }, { ean: contains }] } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          namePl: true,
          status: true,
          brand: { select: { name: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      }),
      prisma.customer.findMany({
        where: { OR: [{ email: contains }, { firstName: contains }, { lastName: contains }] },
        take: LIMIT,
        select: { email: true, firstName: true, lastName: true },
      }),
      // Guests have no Customer row — the Klienci section lists every buyer by e-mail
      prisma.order.findMany({
        where: { OR: [{ customerEmail: contains }, { customerName: contains }] },
        distinct: ["customerEmail"],
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: { customerEmail: true, customerName: true },
      }),
    ]);

    const customers = new Map<string, { email: string; name: string }>();
    for (const a of accounts) {
      const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
      customers.set(a.email.toLowerCase(), { email: a.email, name: name || a.email });
    }
    for (const b of buyers) {
      const key = b.customerEmail.toLowerCase();
      if (!customers.has(key)) customers.set(key, { email: b.customerEmail, name: b.customerName });
    }

    return {
      orders,
      products: products.map((p) => ({
        id: p.id,
        namePl: p.namePl,
        status: p.status,
        brand: p.brand?.name ?? null,
        image: p.images[0]?.url ?? null,
      })),
      customers: [...customers.values()].slice(0, LIMIT),
    };
  });
