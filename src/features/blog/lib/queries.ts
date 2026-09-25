import { unstable_cache } from "next/cache";
import { PRODUCT_LIST_SELECT } from "@/features/catalog/actions";
import { prisma } from "@/lib/prisma";

export const POSTS_TAG = "posts";

// unstable_cache stores results as JSON — Dates come back as strings
const toDate = (value: Date | string) => new Date(value);

const cachedPublishedPosts = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        titlePl: true,
        excerptPl: true,
        coverImage: true,
        categorySlug: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
  ["published-posts"],
  { tags: [POSTS_TAG] },
);

export async function getPublishedPosts() {
  return (await cachedPublishedPosts()).map((post) => ({
    ...post,
    publishedAt: post.publishedAt && toDate(post.publishedAt),
    updatedAt: toDate(post.updatedAt),
  }));
}

const cachedPublishedPost = unstable_cache(
  async (slug: string) => prisma.post.findFirst({ where: { slug, isPublished: true } }),
  ["published-post"],
  { tags: [POSTS_TAG] },
);

export async function getPublishedPost(slug: string) {
  const post = await cachedPublishedPost(slug);
  return (
    post && {
      ...post,
      publishedAt: post.publishedAt && toDate(post.publishedAt),
      createdAt: toDate(post.createdAt),
      updatedAt: toDate(post.updatedAt),
    }
  );
}

/** A few products from the article's category, shown under the text. */
export const getPostProducts = unstable_cache(
  async (categorySlug: string) => {
    const [items, category] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE", categoryLinks: { some: { category: { slug: categorySlug } } } },
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: 8,
        select: PRODUCT_LIST_SELECT,
      }),
      prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { namePl: true, headingPl: true, slug: true },
      }),
    ]);
    return { items, category };
  },
  ["post-products"],
  { tags: [POSTS_TAG, "products", "categories"] },
);
