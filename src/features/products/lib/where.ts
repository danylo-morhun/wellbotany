import type { Prisma } from "@prisma/client";

/** Shared with admin/produkty/page.tsx so bulk "select all matching" resolves the same rows. */
export function buildProductWhere(search?: string): Prisma.ProductWhereInput {
  if (!search) return {};
  return {
    OR: [
      { namePl: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ],
  };
}
