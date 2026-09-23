import type { Prisma } from "@prisma/client";

/**
 * Order for "the product's picture" (`take: 1`): the main image, else the
 * first one — so a product whose main image was deleted still shows a photo.
 */
export const MAIN_IMAGE_FIRST: Prisma.ProductImageOrderByWithRelationInput[] = [
  { isMain: "desc" },
  { sortOrder: "asc" },
];
