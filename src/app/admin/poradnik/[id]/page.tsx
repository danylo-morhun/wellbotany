import { notFound } from "next/navigation";
import { PageHeader } from "@/app/admin/components/ui";
import { PostForm } from "@/features/blog/components/PostForm";
import { prisma } from "@/lib/prisma";

export default async function AdminEditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    prisma.post.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { namePl: "asc" }, select: { slug: true, namePl: true } }),
  ]);
  if (!post) notFound();

  return (
    <div>
      <PageHeader back={{ href: "/admin/poradnik", label: "Poradnik" }} title={post.titlePl} />
      <PostForm key={post.updatedAt.toISOString()} post={post} categories={categories} />
    </div>
  );
}
