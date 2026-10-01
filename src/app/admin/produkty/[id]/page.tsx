import type { ProductStatus } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/app/admin/components/ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ImagesSection } from "@/features/products/components/ImagesSection";
import { ProductForm } from "@/features/products/components/ProductForm";
import { VariantsTable } from "@/features/products/components/VariantsTable";
import { prisma } from "@/lib/prisma";

const STATUS_BADGE: Record<
  ProductStatus,
  { tone: "success" | "neutral" | "warning"; label: string }
> = {
  ACTIVE: { tone: "success", label: "Aktywny" },
  DRAFT: { tone: "warning", label: "Szkic" },
  ARCHIVED: { tone: "neutral", label: "Zarchiwizowany" },
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { namePl: true } });
  return { title: product?.namePl ?? "Produkt" };
}

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, categories, brands, tags] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        tags: true,
        categoryLinks: { select: { categoryId: true } },
        variants: { orderBy: { createdAt: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        brand: { select: { name: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { namePl: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!product) notFound();

  const { variants, images, brand, ...productFields } = product;
  const serializedVariants = variants.map((v) => ({ ...v, vatRate: Number(v.vatRate) }));
  const status = STATUS_BADGE[product.status];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/produkty", label: "Produkty" }}
        title={product.namePl}
        meta={
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        }
        description={[brand?.name, `${variants.length} wariant(y)`].filter(Boolean).join(" · ")}
        actions={
          product.status === "ACTIVE" && (
            <Link
              href={`/produkt/${product.slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Zobacz w sklepie
              <ExternalLink aria-hidden />
            </Link>
          )
        }
      />
      <ProductForm
        product={productFields}
        categories={categories}
        brands={brands}
        tags={tags}
        mediaCount={images.length}
        variantEans={variants.map((v) => v.ean)}
        media={
          <ImagesSection
            productId={product.id}
            images={images}
            // Only what the picker needs — full rows carry a Prisma Decimal, which can't cross to the client
            variants={variants.map(({ id, sku, optionValue }) => ({ id, sku, optionValue }))}
          />
        }
        variants={<VariantsTable productId={product.id} variants={serializedVariants} />}
      />
    </div>
  );
}
