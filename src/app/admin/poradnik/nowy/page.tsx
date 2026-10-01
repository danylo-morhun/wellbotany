import { PageHeader } from "@/app/admin/components/ui";
import { PostForm } from "@/features/blog/components/PostForm";
import { prisma } from "@/lib/prisma";

export default async function AdminNewPostPage() {
  const categories = await prisma.category.findMany({
    orderBy: { namePl: "asc" },
    select: { slug: true, namePl: true },
  });

  return (
    <div>
      <PageHeader back={{ href: "/admin/poradnik", label: "Poradnik" }} title="Nowy artykuł" />
      <PostForm categories={categories} />
    </div>
  );
}
