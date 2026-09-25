"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { POSTS_TAG } from "./lib/queries";
import { deletePostSchema, savePostSchema } from "./schema";

export const savePost = adminActionClient
  .schema(savePostSchema)
  .action(async ({ parsedInput: { id, ...input } }) => {
    const existing = id
      ? await prisma.post.findUnique({ where: { id }, select: { publishedAt: true, slug: true } })
      : null;
    const data = {
      ...input,
      metaTitlePl: input.metaTitlePl || null,
      metaDescPl: input.metaDescPl || null,
      coverImage: input.coverImage || null,
      categorySlug: input.categorySlug || null,
      reviewedBy: input.reviewedBy || null,
      faqPl: input.faqPl.length ? input.faqPl : Prisma.DbNull,
      // First publication date sticks; "updated" comes from updatedAt
      publishedAt: input.isPublished ? (existing?.publishedAt ?? new Date()) : null,
    };
    const post = id
      ? await prisma.post.update({ where: { id }, data })
      : await prisma.post.create({ data });

    revalidateTag(POSTS_TAG, "max");
    revalidatePath("/poradnik");
    revalidatePath(`/poradnik/${post.slug}`);
    if (existing && existing.slug !== post.slug) revalidatePath(`/poradnik/${existing.slug}`);
    revalidatePath("/admin/poradnik");
    return { id: post.id };
  });

export const deletePost = adminActionClient
  .schema(deletePostSchema)
  .action(async ({ parsedInput: { id } }) => {
    const post = await prisma.post.delete({ where: { id }, select: { slug: true } });
    revalidateTag(POSTS_TAG, "max");
    revalidatePath("/poradnik");
    revalidatePath(`/poradnik/${post.slug}`);
    revalidatePath("/admin/poradnik");
    return { success: true };
  });
