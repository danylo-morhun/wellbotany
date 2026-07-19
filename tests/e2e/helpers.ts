import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/prisma";

export const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${RUN_ID}-${counter}`;
}

export async function seedActiveProduct(stock = 20, pricePln = 4990) {
  const product = await prisma.product.create({
    data: {
      slug: unique("e2e-product"),
      namePl: `E2E Test Product ${RUN_ID}`,
      status: "ACTIVE",
      variants: {
        create: { sku: unique("E2E-SKU"), pricePln, vatRate: 23, stock, isDefault: true },
      },
    },
    include: { variants: true },
  });
  return product;
}

export async function seedAdmin(password = "AdminPass123!") {
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.customer.create({
    data: {
      email: `e2e-admin-${RUN_ID}@example.com`,
      firstName: "E2E",
      lastName: "Admin",
      passwordHash,
      isAdmin: true,
    },
  });
  return { admin, password };
}

export async function cleanupProduct(productId: string) {
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
}

export async function cleanupCustomerByEmail(email: string) {
  await prisma.customer.delete({ where: { email } }).catch(() => {});
}

export async function findOrderByEmail(email: string) {
  return prisma.order.findFirst({ where: { customerEmail: email } });
}

export async function cleanupOrder(orderNumber: string) {
  await prisma.order.delete({ where: { orderNumber } }).catch(() => {});
}
