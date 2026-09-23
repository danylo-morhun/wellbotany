import { notFound } from "next/navigation";
import { ImagesSection } from "@/features/products/components/ImagesSection";
import { ProductForm } from "@/features/products/components/ProductForm";
import { VariantsTable } from "@/features/products/components/VariantsTable";
import { prisma } from "@/lib/prisma";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, brands, tags] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        tags: true,
        categoryLinks: { select: { categoryId: true } },
        variants: { orderBy: { createdAt: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { namePl: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!product) notFound();

  const { variants, images, ...productFields } = product;
  const serializedVariants = variants.map((v) => ({ ...v, vatRate: Number(v.vatRate) }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{product.namePl}</h1>
      <ProductForm product={productFields} categories={categories} brands={brands} tags={tags} />
      <VariantsTable productId={product.id} variants={serializedVariants} />
      <ImagesSection productId={product.id} images={images} variants={variants} />
    </div>
  );
}
