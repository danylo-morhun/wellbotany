import { PostForm } from "@/features/blog/components/PostForm";
import { prisma } from "@/lib/prisma";

export default async function AdminNewPostPage() {
  const categories = await prisma.category.findMany({
    orderBy: { namePl: "asc" },
    select: { slug: true, namePl: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Nowy artykuł</h1>
      <PostForm categories={categories} />
    </div>
  );
}
