"use client";

import type { Brand, Category, Product, ProductStatus, ProductTag, Tag } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slugify } from "@/lib/slugify";
import { saveBrand, saveCategory, saveProduct } from "../actions";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Zarchiwizowany",
};

type ProductWithTags = Product & { tags: ProductTag[] };

interface Props {
  product?: ProductWithTags;
  categories: Category[];
  brands: Brand[];
  tags: Tag[];
}

function parseLines(fd: FormData, name: string): string[] {
  const raw = fd.get(name) as string;
  return raw
    ? raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function parseCsv(fd: FormData, name: string): string[] {
  const raw = fd.get(name) as string;
  return raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

export function ProductForm({ product, categories, brands, tags }: Props) {
  const router = useRouter();
  const { execute, isPending } = useAction(saveProduct, {
    onSuccess: ({ data }) => {
      if (!product && data?.id) router.push(`/admin/produkty/${data.id}`);
    },
  });

  // product fields
  const [namePl, setNamePl] = useState(product?.namePl ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!product);
  const [shortDescPl, setShortDescPl] = useState(product?.shortDescPl ?? "");
  const [descriptionPl, setDescriptionPl] = useState(product?.descriptionPl ?? "");
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn ?? "");
  const [descriptionUk, setDescriptionUk] = useState(product?.descriptionUk ?? "");
  const [metaTitlePl, setMetaTitlePl] = useState(product?.metaTitlePl ?? "");
  const [metaDescPl, setMetaDescPl] = useState(product?.metaDescPl ?? "");
  const [tagQuery, setTagQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(product?.tags.map((t) => t.tagId) ?? []),
  );

  // category/brand local state (for inline creation)
  const [localCategories, setLocalCategories] = useState<Array<{ id: string; namePl: string }>>(
    categories.map((c) => ({ id: c.id, namePl: c.namePl })),
  );
  const [localBrands, setLocalBrands] = useState<Array<{ id: string; name: string }>>(
    brands.map((b) => ({ id: b.id, name: b.name })),
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");

  const { execute: execSaveCategory, isPending: savingCat } = useAction(saveCategory, {
    onSuccess: ({ data, input }) => {
      const newId = data?.id;
      if (newId) {
        setLocalCategories((prev) => [...prev, { id: newId, namePl: input.namePl }]);
        setCategoryId(newId);
      }
      setNewCatName("");
      setShowNewCategory(false);
    },
  });

  const { execute: execSaveBrand, isPending: savingBrand } = useAction(saveBrand, {
    onSuccess: ({ data, input }) => {
      const newId = data?.id;
      if (newId) {
        setLocalBrands((prev) => [...prev, { id: newId, name: input.name }]);
        setBrandId(newId);
      }
      setNewBrandName("");
      setShowNewBrand(false);
    },
  });

  const filteredTags = tagQuery
    ? tags.filter((t) => t.namePl.toLowerCase().includes(tagQuery.toLowerCase()))
    : tags;

  // Existing JSON-field values, pre-formatted for their plain-text editors
  const ingredients = product?.ingredients as { pl?: string; en?: string } | null;
  const nutritionFacts = product?.nutritionFacts as Array<{
    name: string;
    amount: string;
    rws?: string;
  }> | null;
  const allergenInfo = product?.allergenInfo as {
    contains?: string[];
    mayContain?: string[];
  } | null;
  const nutritionFactsDefault = (nutritionFacts ?? [])
    .map((n) => `${n.name} | ${n.amount}${n.rws ? ` | ${n.rws}` : ""}`)
    .join("\n");

  function handleNameChange(value: string) {
    setNamePl(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugManual(true);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fillSeo() {
    setMetaTitlePl(namePl.slice(0, 120));
    setMetaDescPl(shortDescPl.slice(0, 320));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const healthWarnings = parseLines(fd, "healthWarnings");
    const benefitsPl = parseLines(fd, "benefitsPl");
    const certifications = parseCsv(fd, "certifications");
    const allergenContains = parseCsv(fd, "allergenContains");
    const allergenMayContain = parseCsv(fd, "allergenMayContain");

    const nutritionFactsInput = parseLines(fd, "nutritionFactsLines")
      .map((line) => {
        const [name, amount, rws] = line.split("|").map((s) => s.trim());
        return { name: name ?? "", amount: amount ?? "", rws: rws || undefined };
      })
      .filter((n) => n.name && n.amount);

    const ingredientsPlInput = (fd.get("ingredientsPl") as string) || undefined;
    const ingredientsEnInput = (fd.get("ingredientsEn") as string) || undefined;
    const ingredientsInput =
      ingredientsPlInput || ingredientsEnInput
        ? { pl: ingredientsPlInput, en: ingredientsEnInput }
        : undefined;

    const allergenInfoInput =
      allergenContains.length > 0 || allergenMayContain.length > 0
        ? { contains: allergenContains, mayContain: allergenMayContain }
        : undefined;

    execute({
      id: (fd.get("id") as string) || undefined,
      slug,
      namePl,
      nameEn: (fd.get("nameEn") as string) || undefined,
      nameUk: (fd.get("nameUk") as string) || undefined,
      shortDescPl: shortDescPl || undefined,
      shortDescEn: (fd.get("shortDescEn") as string) || undefined,
      shortDescUk: (fd.get("shortDescUk") as string) || undefined,
      descriptionPl: descriptionPl || undefined,
      descriptionEn: descriptionEn || undefined,
      descriptionUk: descriptionUk || undefined,
      benefitsPl,
      status: fd.get("status") as ProductStatus,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      isFeatured: fd.get("isFeatured") === "on",
      isNewArrival: fd.get("isNewArrival") === "on",
      isGiftEligible: fd.get("isGiftEligible") === "on",
      netWeight: (fd.get("netWeight") as string) || undefined,
      servingSize: (fd.get("servingSize") as string) || undefined,
      servingsPerContainer: fd.get("servingsPerContainer")
        ? Number(fd.get("servingsPerContainer"))
        : undefined,
      storageInfo: (fd.get("storageInfo") as string) || undefined,
      countryOfOrigin: (fd.get("countryOfOrigin") as string) || undefined,
      usageInstructionsPl: (fd.get("usageInstructionsPl") as string) || undefined,
      ingredients: ingredientsInput,
      nutritionFacts: nutritionFactsInput,
      allergenInfo: allergenInfoInput,
      healthWarnings,
      contraindicationsPl: (fd.get("contraindicationsPl") as string) || undefined,
      ageRestriction: fd.get("ageRestriction") ? Number(fd.get("ageRestriction")) : undefined,
      certifications,
      responsibleEntity: (fd.get("responsibleEntity") as string) || undefined,
      metaTitlePl: metaTitlePl || undefined,
      metaDescPl: metaDescPl || undefined,
      tagIds: Array.from(selectedTagIds),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Podstawowe</TabsTrigger>
          <TabsTrigger value="content">Treść i marketing</TabsTrigger>
          <TabsTrigger value="composition">Skład i wartości odżywcze</TabsTrigger>
          <TabsTrigger value="compliance">Zgodność prawna</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Podstawowe */}
        <TabsContent value="basic" keepMounted className="space-y-6 pt-4">
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Podstawowe informacje</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="namePl" className="mb-1 block text-sm font-medium">
                  Nazwa (PL) *
                </label>
                <input
                  id="namePl"
                  name="namePl"
                  value={namePl}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="slug"
                  className="mb-1 flex items-center gap-1.5 text-sm font-medium"
                >
                  Slug *
                  {!slugManual && (
                    <span className="rounded bg-muted px-1 py-0.5 text-xs font-normal text-muted-foreground">
                      auto
                    </span>
                  )}
                </label>
                <input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                  className="w-full rounded-md border px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="status" className="mb-1 block text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={product?.status ?? "DRAFT"}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category with inline create */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="categoryId" className="text-sm font-medium">
                    Kategoria
                  </label>
                  {!showNewCategory && (
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      + nowa
                    </button>
                  )}
                </div>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">— brak —</option>
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namePl}
                    </option>
                  ))}
                </select>
                {showNewCategory && (
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nazwa kategorii *"
                      className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={savingCat || !newCatName.trim()}
                      onClick={() =>
                        execSaveCategory({ slug: slugify(newCatName), namePl: newCatName })
                      }
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {savingCat ? "…" : "Dodaj"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCatName("");
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Brand with inline create */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="brandId" className="text-sm font-medium">
                    Marka
                  </label>
                  {!showNewBrand && (
                    <button
                      type="button"
                      onClick={() => setShowNewBrand(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      + nowa
                    </button>
                  )}
                </div>
                <select
                  id="brandId"
                  name="brandId"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">— brak —</option>
                  {localBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {showNewBrand && (
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Nazwa marki *"
                      className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      disabled={savingBrand || !newBrandName.trim()}
                      onClick={() =>
                        execSaveBrand({ slug: slugify(newBrandName), name: newBrandName })
                      }
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {savingBrand ? "…" : "Dodaj"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewBrand(false);
                        setNewBrandName("");
                      }}
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="shortDescPl" className="mb-1 block text-sm font-medium">
                  Krótki opis (PL)
                </label>
                <textarea
                  id="shortDescPl"
                  name="shortDescPl"
                  value={shortDescPl}
                  onChange={(e) => setShortDescPl(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="descriptionPl" className="mb-1 block text-sm font-medium">
                  Pełny opis (PL)
                </label>
                <RichTextEditor
                  id="descriptionPl"
                  value={descriptionPl}
                  onChange={setDescriptionPl}
                />
              </div>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} />
                  Wyróżniony
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isNewArrival"
                    defaultChecked={product?.isNewArrival}
                  />
                  Nowość
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isGiftEligible"
                    defaultChecked={product?.isGiftEligible}
                  />
                  Dostępny w kreatorze zestawów prezentowych
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Tagi</h2>
              {selectedTagIds.size > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {selectedTagIds.size} {selectedTagIds.size === 1 ? "wybrany" : "wybranych"}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Szukaj tagów…"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              className="mb-3 w-full rounded-md border px-3 py-1.5 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => (
                <label key={tag.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                  {tag.namePl}
                </label>
              ))}
              {filteredTags.length === 0 && (
                <p className="text-sm text-muted-foreground">Brak wyników</p>
              )}
            </div>
          </section>
        </TabsContent>

        {/* Treść i marketing */}
        <TabsContent value="content" keepMounted className="space-y-6 pt-4">
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Nazwa i opis — tłumaczenia</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nameEn" className="mb-1 block text-sm font-medium">
                  Nazwa (EN)
                </label>
                <input
                  id="nameEn"
                  name="nameEn"
                  defaultValue={product?.nameEn ?? ""}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="nameUk" className="mb-1 block text-sm font-medium">
                  Nazwa (UK)
                </label>
                <input
                  id="nameUk"
                  name="nameUk"
                  defaultValue={product?.nameUk ?? ""}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="shortDescEn" className="mb-1 block text-sm font-medium">
                  Krótki opis (EN)
                </label>
                <textarea
                  id="shortDescEn"
                  name="shortDescEn"
                  defaultValue={product?.shortDescEn ?? ""}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="shortDescUk" className="mb-1 block text-sm font-medium">
                  Krótki opis (UK)
                </label>
                <textarea
                  id="shortDescUk"
                  name="shortDescUk"
                  defaultValue={product?.shortDescUk ?? ""}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="descriptionEn" className="mb-1 block text-sm font-medium">
                  Pełny opis (EN)
                </label>
                <RichTextEditor
                  id="descriptionEn"
                  value={descriptionEn}
                  onChange={setDescriptionEn}
                />
              </div>
              <div>
                <label htmlFor="descriptionUk" className="mb-1 block text-sm font-medium">
                  Pełny opis (UK)
                </label>
                <RichTextEditor
                  id="descriptionUk"
                  value={descriptionUk}
                  onChange={setDescriptionUk}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-1 font-semibold">Kluczowe korzyści</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Krótkie hasła pod tytułem (max 4-6), każde w nowej linii. Marketingowy hook — bez
              nowych twierdzeń o działaniu, których nie ma w opisie/etykiecie.
            </p>
            <textarea
              id="benefitsPl"
              name="benefitsPl"
              defaultValue={
                Array.isArray(product?.benefitsPl)
                  ? (product.benefitsPl as string[]).join("\n")
                  : ""
              }
              rows={4}
              placeholder={"Wysoka biodostępność\nBez konserwantów\nWegański skład"}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </section>
        </TabsContent>

        {/* Skład i wartości odżywcze */}
        <TabsContent value="composition" keepMounted className="space-y-6 pt-4">
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Szczegóły suplementu</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="netWeight" className="mb-1 block text-sm font-medium">
                  Waga netto
                </label>
                <input
                  id="netWeight"
                  name="netWeight"
                  defaultValue={product?.netWeight ?? ""}
                  placeholder="120 g"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="servingSize" className="mb-1 block text-sm font-medium">
                  Porcja
                </label>
                <input
                  id="servingSize"
                  name="servingSize"
                  defaultValue={product?.servingSize ?? ""}
                  placeholder="2 kapsułki"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="servingsPerContainer" className="mb-1 block text-sm font-medium">
                  Liczba porcji
                </label>
                <input
                  id="servingsPerContainer"
                  name="servingsPerContainer"
                  type="number"
                  min={1}
                  defaultValue={product?.servingsPerContainer ?? ""}
                  placeholder="60"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="countryOfOrigin" className="mb-1 block text-sm font-medium">
                  Kraj pochodzenia
                </label>
                <input
                  id="countryOfOrigin"
                  name="countryOfOrigin"
                  defaultValue={product?.countryOfOrigin ?? ""}
                  placeholder="PL"
                  maxLength={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="usageInstructionsPl" className="mb-1 block text-sm font-medium">
                  Sposób użycia
                </label>
                <textarea
                  id="usageInstructionsPl"
                  name="usageInstructionsPl"
                  defaultValue={product?.usageInstructionsPl ?? ""}
                  rows={2}
                  placeholder="Przyjmować 1 kapsułkę dziennie, popijając wodą, najlepiej z posiłkiem."
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="storageInfo" className="mb-1 block text-sm font-medium">
                  Warunki przechowywania
                </label>
                <textarea
                  id="storageInfo"
                  name="storageInfo"
                  defaultValue={product?.storageInfo ?? ""}
                  rows={2}
                  placeholder="Przechowywać w suchym miejscu, w temperaturze poniżej 25°C."
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-1 font-semibold">Skład</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Pełna lista składników z etykiety (za spadem wagi, alergeny pogrubić) — dosłownie od
              dostawcy/producenta, nie generować.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ingredientsPl" className="mb-1 block text-sm font-medium">
                  Pełny skład (PL)
                </label>
                <textarea
                  id="ingredientsPl"
                  name="ingredientsPl"
                  defaultValue={ingredients?.pl ?? ""}
                  rows={3}
                  placeholder="Ekstrakt z kurkumy, celuloza mikrokrystaliczna, otoczka kapsułki: hypromeloza…"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ingredientsEn" className="mb-1 block text-sm font-medium">
                  Pełny skład (EN)
                </label>
                <textarea
                  id="ingredientsEn"
                  name="ingredientsEn"
                  defaultValue={ingredients?.en ?? ""}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-1 font-semibold">Wartości odżywcze</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Aktywne składniki: jedna linia na składnik, format{" "}
              <code className="rounded bg-muted px-1">Nazwa | Dawka na porcję | %RWS</code>. %RWS
              opcjonalne.
            </p>
            <textarea
              id="nutritionFactsLines"
              name="nutritionFactsLines"
              defaultValue={nutritionFactsDefault}
              rows={4}
              placeholder={"Witamina C | 80 mg | 100%\nCynk | 10 mg | 100%"}
              className="w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Alergeny</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="allergenContains" className="mb-1 block text-sm font-medium">
                  Zawiera (oddziel przecinkami)
                </label>
                <input
                  id="allergenContains"
                  name="allergenContains"
                  defaultValue={(allergenInfo?.contains ?? []).join(", ")}
                  placeholder="gluten, soja"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="allergenMayContain" className="mb-1 block text-sm font-medium">
                  Może zawierać śladowe ilości
                </label>
                <input
                  id="allergenMayContain"
                  name="allergenMayContain"
                  defaultValue={(allergenInfo?.mayContain ?? []).join(", ")}
                  placeholder="orzechy, mleko"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </TabsContent>

        {/* Zgodność prawna */}
        <TabsContent value="compliance" keepMounted className="space-y-6 pt-4">
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 font-semibold">Regulacje i bezpieczeństwo</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="healthWarnings" className="mb-1 block text-sm font-medium">
                  Ostrzeżenia ustawowe (każde w nowej linii)
                </label>
                <textarea
                  id="healthWarnings"
                  name="healthWarnings"
                  defaultValue={
                    Array.isArray(product?.healthWarnings)
                      ? (product.healthWarnings as string[]).join("\n")
                      : ""
                  }
                  rows={3}
                  placeholder="Suplement diety nie zastępuje zrównoważonej diety…"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contraindicationsPl" className="mb-1 block text-sm font-medium">
                  Przeciwwskazania produktowe
                </label>
                <textarea
                  id="contraindicationsPl"
                  name="contraindicationsPl"
                  defaultValue={product?.contraindicationsPl ?? ""}
                  rows={2}
                  placeholder="Nie stosować w ciąży i w okresie karmienia piersią. Może nasilać działanie leków…"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="ageRestriction" className="mb-1 block text-sm font-medium">
                  Min. wiek
                </label>
                <input
                  id="ageRestriction"
                  name="ageRestriction"
                  type="number"
                  min={1}
                  defaultValue={product?.ageRestriction ?? ""}
                  placeholder="18"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="certifications" className="mb-1 block text-sm font-medium">
                  Certyfikaty (oddziel przecinkami)
                </label>
                <input
                  id="certifications"
                  name="certifications"
                  defaultValue={
                    Array.isArray(product?.certifications)
                      ? (product.certifications as string[]).join(", ")
                      : ""
                  }
                  placeholder="GMP, HACCP, Wegański"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="responsibleEntity" className="mb-1 block text-sm font-medium">
                  Podmiot odpowiedzialny (nazwa + adres)
                </label>
                <input
                  id="responsibleEntity"
                  name="responsibleEntity"
                  defaultValue={product?.responsibleEntity ?? ""}
                  placeholder="Nazwa Sp. z o.o., ul. Przykładowa 1, 00-000 Warszawa"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" keepMounted className="space-y-6 pt-4">
          <section className="rounded-2xl bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">SEO</h2>
              <button
                type="button"
                onClick={fillSeo}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
              >
                Uzupełnij z treści
              </button>
            </div>
            <div className="grid gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="metaTitlePl" className="text-sm font-medium">
                    Meta tytuł (PL)
                  </label>
                  <span className="text-xs text-muted-foreground">{metaTitlePl.length}/120</span>
                </div>
                <input
                  id="metaTitlePl"
                  name="metaTitlePl"
                  value={metaTitlePl}
                  onChange={(e) => setMetaTitlePl(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="metaDescPl" className="text-sm font-medium">
                    Meta opis (PL)
                  </label>
                  <span className="text-xs text-muted-foreground">{metaDescPl.length}/320</span>
                </div>
                <textarea
                  id="metaDescPl"
                  name="metaDescPl"
                  value={metaDescPl}
                  onChange={(e) => setMetaDescPl(e.target.value)}
                  rows={2}
                  maxLength={320}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep disabled:opacity-50 motion-reduce:transition-none"
        >
          {isPending ? "Zapisywanie…" : product ? "Zapisz zmiany" : "Utwórz produkt"}
        </button>
      </div>
    </form>
  );
}
