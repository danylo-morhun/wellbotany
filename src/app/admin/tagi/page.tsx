import type { Metadata } from "next";
import { TagForm } from "@/features/products/components/TagForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tagi" };

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: [{ sortOrder: "asc" }, { namePl: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <TagForm tags={tags.map(({ _count, ...t }) => ({ ...t, productCount: _count.products }))} />
  );
}
