"use client";

import type {
  Brand,
  Category,
  CategoryGroup,
  Product,
  ProductStatus,
  ProductTag,
  Tag,
  TagType,
} from "@prisma/client";
import { Check, ChevronDown, ExternalLink, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toBrandOptions } from "@/features/catalog/lib/brand-tree";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { saveBrand, saveCategory, saveProduct } from "../actions";
import { productCompleteness } from "../lib/completeness";
import { type NutritionRow, readNutritionFacts } from "../lib/nutrition-facts";
import type { ProductInput } from "../schema";
import { ChipsInput } from "./editor/ChipsInput";
import { Field, Section, Segmented, Switch, TextArea, TextInput } from "./editor/fields";
import { ListEditor } from "./editor/ListEditor";
import { NutritionEditor, type NutritionState } from "./editor/NutritionEditor";
import { MultiPicker, type PickerOption, SearchSelect } from "./editor/Pickers";
import { SeoPreview } from "./editor/SeoPreview";
import { useUnsavedChanges } from "./editor/useUnsavedChanges";

type ProductWithTags = Product & {
  tags: ProductTag[];
  categoryLinks: { categoryId: string }[];
};

interface Props {
  product?: ProductWithTags;
  categories: Category[];
  brands: Brand[];
  tags: Tag[];
  /** Server-rendered image manager, placed in the main column (edit mode only) */
  media?: React.ReactNode;
  /** Server-rendered variants table (edit mode only) */
  variants?: React.ReactNode;
  mediaCount?: number;
  variantEans?: (string | null)[];
}

const GROUP_LABELS: Record<CategoryGroup, string> = {
  TYPE: "Rodzaj",
  NEED: "Na co",
  AUDIENCE: "Dla kogo",
  OTHER: "Inne",
};
const GROUP_ORDER: CategoryGroup[] = ["TYPE", "NEED", "AUDIENCE", "OTHER"];
const TAG_GROUP_LABELS: Record<TagType, string> = {
  DIETARY_CLAIM: "Dieta",
  ALLERGEN_FREE: "Bez alergenów",
  CERTIFICATION: "Certyfikaty",
  OTHER: "Inne",
};

// The 14 allergens of Reg. 1169/2011 Annex II, in label wording
const EU_ALLERGENS = [
  "gluten",
  "skorupiaki",
  "jaja",
  "ryby",
  "orzeszki ziemne",
  "soja",
  "mleko",
  "orzechy",
  "seler",
  "gorczyca",
  "sezam",
  "dwutlenek siarki",
  "łubin",
  "mięczaki",
];
const CERT_SUGGESTIONS = ["GMP", "HACCP", "Wegański", "Bezglutenowy", "BIO", "Non-GMO"];
// Mandatory label statements for food supplements (ustawa o bezpieczeństwie żywności, art. 27)
const SUPPLEMENT_WARNINGS = [
  "Nie przekraczać zalecanej porcji do spożycia w ciągu dnia.",
  "Suplement diety nie może być stosowany jako substytut (zamiennik) zróżnicowanej diety.",
  "Zrównoważony sposób żywienia i zdrowy tryb życia są ważne dla funkcjonowania organizmu.",
  "Przechowywać w miejscu niedostępnym dla małych dzieci.",
];

type Values = {
  namePl: string;
  slug: string;
  status: ProductStatus;
  categoryId: string;
  brandId: string;
  extraCategoryIds: string[];
  tagIds: string[];
  shortDescPl: string;
  descriptionPl: string;
  benefitsPl: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isGiftEligible: boolean;
  isInGoogleFeed: boolean;
  netWeight: string;
  servingSize: string;
  servingsPerContainer: string;
  countryOfOrigin: string;
  usageInstructionsPl: string;
  storageInfo: string;
  ingredientsPl: string;
  ingredientsEn: string;
  nutrition: NutritionState;
  allergenContains: string[];
  allergenMayContain: string[];
  healthWarnings: string[];
  contraindicationsPl: string;
  ageRestriction: string;
  certifications: string[];
  responsibleEntity: string;
  metaTitlePl: string;
  metaDescPl: string;
  nameEn: string;
  nameUk: string;
  shortDescEn: string;
  shortDescUk: string;
  descriptionEn: string;
  descriptionUk: string;
};

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function initialValues(p?: ProductWithTags): Values {
  const ingredients = p?.ingredients as { pl?: string; en?: string } | null;
  const allergens = p?.allergenInfo as { contains?: string[]; mayContain?: string[] } | null;
  const nf = readNutritionFacts(p?.nutritionFacts);
  return {
    namePl: p?.namePl ?? "",
    slug: p?.slug ?? "",
    status: p?.status ?? "DRAFT",
    categoryId: p?.categoryId ?? "",
    brandId: p?.brandId ?? "",
    extraCategoryIds:
      p?.categoryLinks.map((l) => l.categoryId).filter((id) => id !== p.categoryId) ?? [],
    tagIds: p?.tags.map((t) => t.tagId) ?? [],
    shortDescPl: p?.shortDescPl ?? "",
    descriptionPl: p?.descriptionPl ?? "",
    benefitsPl: strArray(p?.benefitsPl),
    isFeatured: p?.isFeatured ?? false,
    isNewArrival: p?.isNewArrival ?? false,
    isGiftEligible: p?.isGiftEligible ?? true,
    isInGoogleFeed: p?.isInGoogleFeed ?? true,
    netWeight: p?.netWeight ?? "",
    servingSize: p?.servingSize ?? "",
    servingsPerContainer: p?.servingsPerContainer?.toString() ?? "",
    countryOfOrigin: p?.countryOfOrigin ?? "",
    usageInstructionsPl: p?.usageInstructionsPl ?? "",
    storageInfo: p?.storageInfo ?? "",
    ingredientsPl: ingredients?.pl ?? "",
    ingredientsEn: ingredients?.en ?? "",
    nutrition: nf.text ? { mode: "text", text: nf.text } : { mode: "rows", rows: nf.rows },
    allergenContains: allergens?.contains ?? [],
    allergenMayContain: allergens?.mayContain ?? [],
    healthWarnings: strArray(p?.healthWarnings),
    contraindicationsPl: p?.contraindicationsPl ?? "",
    ageRestriction: p?.ageRestriction?.toString() ?? "",
    certifications: strArray(p?.certifications),
    responsibleEntity: p?.responsibleEntity ?? "",
    metaTitlePl: p?.metaTitlePl ?? "",
    metaDescPl: p?.metaDescPl ?? "",
    nameEn: p?.nameEn ?? "",
    nameUk: p?.nameUk ?? "",
    shortDescEn: p?.shortDescEn ?? "",
    shortDescUk: p?.shortDescUk ?? "",
    descriptionEn: p?.descriptionEn ?? "",
    descriptionUk: p?.descriptionUk ?? "",
  };
}

const opt = (s: string) => s.trim() || undefined;
const lines = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
const num = (s: string) => (s.trim() ? Number(s) : undefined);

function toPayload(v: Values, id?: string): ProductInput {
  const rows: NutritionRow[] =
    v.nutrition.mode === "rows"
      ? v.nutrition.rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name.trim(), amount: r.amount.trim(), rws: opt(r.rws ?? "") }))
      : [];
  return {
    id,
    slug: v.slug.trim(),
    namePl: v.namePl.trim(),
    status: v.status,
    categoryId: opt(v.categoryId),
    brandId: opt(v.brandId),
    extraCategoryIds: v.extraCategoryIds.filter((c) => c !== v.categoryId),
    tagIds: v.tagIds,
    shortDescPl: opt(v.shortDescPl),
    descriptionPl: opt(v.descriptionPl),
    benefitsPl: lines(v.benefitsPl),
    isFeatured: v.isFeatured,
    isNewArrival: v.isNewArrival,
    isGiftEligible: v.isGiftEligible,
    isInGoogleFeed: v.isInGoogleFeed,
    netWeight: opt(v.netWeight),
    servingSize: opt(v.servingSize),
    servingsPerContainer: num(v.servingsPerContainer),
    countryOfOrigin: opt(v.countryOfOrigin),
    usageInstructionsPl: opt(v.usageInstructionsPl),
    storageInfo: opt(v.storageInfo),
    ingredients: { pl: opt(v.ingredientsPl), en: opt(v.ingredientsEn) },
    nutritionFacts:
      v.nutrition.mode === "text"
        ? v.nutrition.text.trim()
          ? { pl: v.nutrition.text.trim() }
          : []
        : rows,
    allergenInfo: { contains: v.allergenContains, mayContain: v.allergenMayContain },
    healthWarnings: lines(v.healthWarnings),
    contraindicationsPl: opt(v.contraindicationsPl),
    ageRestriction: num(v.ageRestriction),
    certifications: v.certifications,
    responsibleEntity: opt(v.responsibleEntity),
    metaTitlePl: opt(v.metaTitlePl),
    metaDescPl: opt(v.metaDescPl),
    nameEn: opt(v.nameEn),
    nameUk: opt(v.nameUk),
    shortDescEn: opt(v.shortDescEn),
    shortDescUk: opt(v.shortDescUk),
    descriptionEn: opt(v.descriptionEn),
    descriptionUk: opt(v.descriptionUk),
  };
}

// Rich-text fields round-trip through TipTap, which may normalize empty
// content to "<p></p>" — don't count that as an edit
const normalizeHtml = (html: string) => (html.replace(/<p><\/p>/g, "").trim() ? html : "");

function firstValidationError(fieldErrors: unknown): string | undefined {
  if (!fieldErrors || typeof fieldErrors !== "object") return undefined;
  for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    const messages = (value as { _errors?: string[] } | undefined)?._errors;
    if (messages?.length) return `${field}: ${messages[0]}`;
  }
  return undefined;
}

const SECTION_FOR_CHECK: Record<string, string> = {
  images: "media",
  description: "opis",
  shortDesc: "opis",
  category: "organizacja",
  brand: "organizacja",
  ean: "warianty",
  ingredients: "sklad",
  usage: "sklad",
  responsible: "zgodnosc",
  seo: "seo",
};

export function ProductForm({
  product,
  categories,
  brands,
  tags,
  media,
  variants,
  mediaCount = 0,
  variantEans = [],
}: Props) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(() => initialValues(product));
  const [values, setValues] = useState(baseline);
  const [slugManual, setSlugManual] = useState(!!product);
  // Bumped on discard so uncontrolled rich-text editors reload their content
  const [editorKey, setEditorKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  }, []);

  const payload = useMemo(() => toPayload(values, product?.id), [values, product?.id]);
  const dirty = useMemo(() => {
    const norm = (p: ProductInput) =>
      JSON.stringify({
        ...p,
        descriptionPl: normalizeHtml(p.descriptionPl ?? ""),
        descriptionEn: normalizeHtml(p.descriptionEn ?? ""),
        descriptionUk: normalizeHtml(p.descriptionUk ?? ""),
      });
    return norm(payload) !== norm(toPayload(baseline, product?.id));
  }, [payload, baseline, product?.id]);
  useUnsavedChanges(dirty);

  // Local option lists (inline-created categories/brands appear immediately)
  const [localCategories, setLocalCategories] = useState(
    categories.map((c) => ({ id: c.id, namePl: c.namePl, group: c.group })),
  );
  const [localBrands, setLocalBrands] = useState(
    toBrandOptions(brands).map((b) => ({ id: b.id, label: b.label })),
  );
  const categoryOptions: PickerOption[] = useMemo(
    () =>
      GROUP_ORDER.flatMap((g) =>
        localCategories
          .filter((c) => c.group === g)
          .sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"))
          .map((c) => ({ id: c.id, label: c.namePl, group: GROUP_LABELS[g] })),
      ),
    [localCategories],
  );
  const tagOptions: PickerOption[] = useMemo(
    () =>
      [...tags]
        .sort((a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder)
        .map((t) => ({ id: t.id, label: t.namePl, group: TAG_GROUP_LABELS[t.type] })),
    [tags],
  );

  const { execute: execSaveCategory } = useAction(saveCategory, {
    onSuccess: ({ data, input }) => {
      if (!data?.id) return;
      setLocalCategories((prev) => [...prev, { id: data.id, namePl: input.namePl, group: "TYPE" }]);
      set("categoryId", data.id);
      toast.success(`Dodano kategorię „${input.namePl}”`);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu kategorii"),
  });
  const { execute: execSaveBrand } = useAction(saveBrand, {
    onSuccess: ({ data, input }) => {
      if (!data?.id) return;
      setLocalBrands((prev) => [...prev, { id: data.id, label: input.name }]);
      set("brandId", data.id);
      toast.success(`Dodano markę „${input.name}”`);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu marki"),
  });

  const { execute, isPending } = useAction(saveProduct, {
    onSuccess: ({ data }) => {
      toast.success(product ? "Zapisano zmiany" : "Produkt utworzony");
      setBaseline(values);
      if (!product && data?.id) router.push(`/admin/produkty/${data.id}`);
      else router.refresh();
    },
    onError: ({ error }) => {
      toast.error(
        error?.serverError ?? firstValidationError(error?.validationErrors) ?? "Błąd zapisu",
      );
    },
  });

  const save = useCallback(() => {
    const next: Record<string, string> = {};
    if (!values.namePl.trim()) next.namePl = "Podaj nazwę produktu";
    if (!values.slug.trim()) next.slug = "Podaj adres URL";
    setErrors(next);
    const firstError = Object.keys(next)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      toast.error(next[firstError]);
      return;
    }
    execute(payload);
  }, [values, payload, execute]);

  function discard() {
    setValues(baseline);
    setErrors({});
    setEditorKey((k) => k + 1);
  }

  // ⌘S / Ctrl+S saves from anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty || !product) save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, product, save]);

  const completeness = productCompleteness({
    descriptionPl: normalizeHtml(values.descriptionPl),
    shortDescPl: values.shortDescPl,
    categoryId: values.categoryId,
    brandId: values.brandId,
    ingredients: values.ingredientsPl.trim() ? values.ingredientsPl : null,
    usageInstructionsPl: values.usageInstructionsPl,
    responsibleEntity: values.responsibleEntity,
    metaDescPl: values.metaDescPl,
    images: Array.from({ length: mediaCount }),
    variants: variantEans.map((ean) => ({ ean })),
  });

  const brandLabel = localBrands.find((b) => b.id === values.brandId)?.label;
  const autoTitle =
    brandLabel && !values.namePl.toLowerCase().includes(brandLabel.toLowerCase())
      ? `${values.namePl} – ${brandLabel}`
      : values.namePl;
  const missingWarnings = SUPPLEMENT_WARNINGS.filter((w) => !values.healthWarnings.includes(w));

  return (
    <div>
      {(dirty || !product) && (
        <div className="sticky top-16 z-20 mb-4 flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-float">
          <span className="flex-1 font-medium">
            {product ? "Niezapisane zmiany" : "Nowy produkt — nie zapisano"}
          </span>
          {product && (
            <button
              type="button"
              onClick={discard}
              className="h-8 rounded-lg px-3 font-medium text-background/80 hover:bg-background/10 hover:text-background"
            >
              Odrzuć
            </button>
          )}
          <Button onClick={save} disabled={isPending} className="h-8 bg-primary px-3">
            {isPending ? "Zapisywanie…" : product ? "Zapisz" : "Utwórz produkt"}
            <kbd className="ml-1 hidden rounded bg-background/15 px-1 text-[11px] sm:inline">
              ⌘S
            </kbd>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section id="opis" title="Podstawowe">
            <Field label="Nazwa" htmlFor="namePl" error={errors.namePl}>
              <TextInput
                id="namePl"
                value={values.namePl}
                aria-invalid={!!errors.namePl}
                placeholder="np. Witamina D3 2000 IU – 90 kapsułek"
                onChange={(e) => {
                  set("namePl", e.target.value);
                  if (!slugManual) set("slug", slugify(e.target.value));
                }}
                className="h-10 text-base font-medium"
              />
            </Field>
            <Field
              label="Krótki opis"
              htmlFor="shortDescPl"
              hint="Pod tytułem na karcie produktu i w wynikach wyszukiwania, gdy brak meta opisu."
              counter={{ value: values.shortDescPl.length, max: 1000, ideal: 200 }}
            >
              <TextArea
                id="shortDescPl"
                value={values.shortDescPl}
                maxLength={1000}
                onChange={(e) => set("shortDescPl", e.target.value)}
              />
            </Field>
            <Field label="Opis" htmlFor="descriptionPl">
              <RichTextEditor
                key={`pl-${editorKey}`}
                id="descriptionPl"
                value={values.descriptionPl}
                onChange={(html) => set("descriptionPl", html)}
              />
            </Field>
            <Field
              label="Kluczowe korzyści"
              hint="Krótkie hasła pod tytułem (4–6). Bez nowych twierdzeń o działaniu, których nie ma w opisie lub na etykiecie."
            >
              <ListEditor
                items={values.benefitsPl}
                onChange={(v) => set("benefitsPl", v)}
                placeholder="np. Wysoka biodostępność"
                addLabel="Dodaj korzyść"
                max={10}
                maxLength={200}
              />
            </Field>
          </Section>

          <div id="media" className="scroll-mt-24">
            {media ?? <Placeholder title="Zdjęcia" text="Zdjęcia dodasz po utworzeniu produktu." />}
          </div>
          <div id="warianty" className="scroll-mt-24">
            {variants ?? (
              <Placeholder
                title="Warianty, ceny i stany"
                text="Warianty (SKU, EAN, cena, stan) dodasz po utworzeniu produktu."
              />
            )}
          </div>

          <Section
            id="sklad"
            title="Skład i dawkowanie"
            description="Dane z etykiety producenta — przepisuj dosłownie, nie generuj."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Zawartość opakowania" htmlFor="netWeight">
                <TextInput
                  id="netWeight"
                  value={values.netWeight}
                  placeholder="60 kaps. / 120 g"
                  onChange={(e) => set("netWeight", e.target.value)}
                />
              </Field>
              <Field label="Porcja dzienna" htmlFor="servingSize">
                <TextInput
                  id="servingSize"
                  value={values.servingSize}
                  placeholder="2 kapsułki"
                  onChange={(e) => set("servingSize", e.target.value)}
                />
              </Field>
              <Field label="Liczba porcji" htmlFor="servingsPerContainer">
                <TextInput
                  id="servingsPerContainer"
                  type="number"
                  min={1}
                  value={values.servingsPerContainer}
                  placeholder="30"
                  onChange={(e) => set("servingsPerContainer", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Sposób użycia" htmlFor="usageInstructionsPl">
              <TextArea
                id="usageInstructionsPl"
                value={values.usageInstructionsPl}
                placeholder="Przyjmować 1 kapsułkę dziennie, popijając wodą, najlepiej z posiłkiem."
                onChange={(e) => set("usageInstructionsPl", e.target.value)}
              />
            </Field>
            <Field
              label="Składniki"
              htmlFor="ingredientsPl"
              hint="Pełna lista z etykiety, w kolejności malejącej masy."
            >
              <TextArea
                id="ingredientsPl"
                value={values.ingredientsPl}
                placeholder="Ekstrakt z kurkumy, celuloza mikrokrystaliczna, otoczka kapsułki: hypromeloza…"
                onChange={(e) => set("ingredientsPl", e.target.value)}
              />
            </Field>
            <Field label="Wartości odżywcze (na porcję)">
              <NutritionEditor value={values.nutrition} onChange={(v) => set("nutrition", v)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Zawiera alergeny" htmlFor="allergenContains">
                <ChipsInput
                  id="allergenContains"
                  values={values.allergenContains}
                  onChange={(v) => set("allergenContains", v)}
                  placeholder="Wpisz lub wybierz…"
                  suggestions={EU_ALLERGENS.slice(0, 7)}
                />
              </Field>
              <Field label="Może zawierać śladowe ilości" htmlFor="allergenMayContain">
                <ChipsInput
                  id="allergenMayContain"
                  values={values.allergenMayContain}
                  onChange={(v) => set("allergenMayContain", v)}
                  placeholder="Wpisz lub wybierz…"
                  suggestions={EU_ALLERGENS.slice(0, 7)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Przechowywanie" htmlFor="storageInfo">
                <TextArea
                  id="storageInfo"
                  value={values.storageInfo}
                  placeholder="W suchym miejscu, w temperaturze poniżej 25°C."
                  onChange={(e) => set("storageInfo", e.target.value)}
                />
              </Field>
              <Field label="Kraj pochodzenia / producent" htmlFor="countryOfOrigin">
                <TextArea
                  id="countryOfOrigin"
                  value={values.countryOfOrigin}
                  maxLength={300}
                  placeholder="np. Polska (Health Labs Care S.A., Warszawa)"
                  onChange={(e) => set("countryOfOrigin", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section
            id="zgodnosc"
            title="Zgodność prawna"
            description="GIS / rozporządzenie 1169/2011 — wyświetlane w sekcji „Ważne informacje”."
          >
            <Field label="Ostrzeżenia na etykiecie">
              <ListEditor
                items={values.healthWarnings}
                onChange={(v) => set("healthWarnings", v)}
                placeholder="Treść ostrzeżenia"
                addLabel="Dodaj ostrzeżenie"
              />
              {missingWarnings.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    set("healthWarnings", [...lines(values.healthWarnings), ...missingWarnings])
                  }
                  className="mt-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Sparkles className="size-4" aria-hidden />
                  Wstaw obowiązkowe dla suplementów ({missingWarnings.length})
                </button>
              )}
            </Field>
            <Field label="Przeciwwskazania" htmlFor="contraindicationsPl">
              <TextArea
                id="contraindicationsPl"
                value={values.contraindicationsPl}
                placeholder="Nie stosować w ciąży i w okresie karmienia piersią…"
                onChange={(e) => set("contraindicationsPl", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field label="Minimalny wiek" htmlFor="ageRestriction">
                <TextInput
                  id="ageRestriction"
                  type="number"
                  min={1}
                  value={values.ageRestriction}
                  placeholder="—"
                  onChange={(e) => set("ageRestriction", e.target.value)}
                />
              </Field>
              <Field label="Certyfikaty" htmlFor="certifications">
                <ChipsInput
                  id="certifications"
                  values={values.certifications}
                  onChange={(v) => set("certifications", v)}
                  suggestions={CERT_SUGGESTIONS}
                  max={10}
                />
              </Field>
            </div>
            <Field
              label="Podmiot odpowiedzialny"
              htmlFor="responsibleEntity"
              hint="Nazwa i adres producenta lub importera do UE (art. 9 ust. 1 lit. h)."
            >
              <TextInput
                id="responsibleEntity"
                value={values.responsibleEntity}
                maxLength={300}
                placeholder="Nazwa Sp. z o.o., ul. Przykładowa 1, 00-000 Warszawa"
                onChange={(e) => set("responsibleEntity", e.target.value)}
              />
            </Field>
          </Section>

          <Section
            id="seo"
            title="Wyszukiwarki"
            actions={
              <button
                type="button"
                onClick={() =>
                  setValues((v) => ({
                    ...v,
                    metaTitlePl: v.metaTitlePl || autoTitle.slice(0, 120),
                    metaDescPl: v.metaDescPl || v.shortDescPl.slice(0, 320),
                  }))
                }
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Sparkles className="size-4" aria-hidden />
                Uzupełnij z treści
              </button>
            }
          >
            <SeoPreview
              slug={values.slug}
              title={values.metaTitlePl || autoTitle}
              description={values.metaDescPl || values.shortDescPl}
            />
            <Field
              label="Tytuł strony"
              htmlFor="metaTitlePl"
              hint="Puste = nazwa produktu + marka."
              counter={{ value: values.metaTitlePl.length, max: 120, ideal: 60 }}
            >
              <TextInput
                id="metaTitlePl"
                value={values.metaTitlePl}
                maxLength={120}
                placeholder={autoTitle}
                onChange={(e) => set("metaTitlePl", e.target.value)}
              />
            </Field>
            <Field
              label="Meta opis"
              htmlFor="metaDescPl"
              hint="Puste = krótki opis."
              counter={{ value: values.metaDescPl.length, max: 320, ideal: 160 }}
            >
              <TextArea
                id="metaDescPl"
                value={values.metaDescPl}
                maxLength={320}
                placeholder={values.shortDescPl}
                onChange={(e) => set("metaDescPl", e.target.value)}
              />
            </Field>
          </Section>

          <details id="tlumaczenia" className="group scroll-mt-24 rounded-2xl bg-card shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-[15px] font-semibold">Tłumaczenia</span>
                <span className="block text-xs text-muted-foreground">
                  EN / UK — opcjonalne, sklep działa po polsku.
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2">
              <Field label="Nazwa (EN)" htmlFor="nameEn">
                <TextInput
                  id="nameEn"
                  value={values.nameEn}
                  onChange={(e) => set("nameEn", e.target.value)}
                />
              </Field>
              <Field label="Nazwa (UK)" htmlFor="nameUk">
                <TextInput
                  id="nameUk"
                  value={values.nameUk}
                  onChange={(e) => set("nameUk", e.target.value)}
                />
              </Field>
              <Field label="Krótki opis (EN)" htmlFor="shortDescEn">
                <TextArea
                  id="shortDescEn"
                  value={values.shortDescEn}
                  onChange={(e) => set("shortDescEn", e.target.value)}
                />
              </Field>
              <Field label="Krótki opis (UK)" htmlFor="shortDescUk">
                <TextArea
                  id="shortDescUk"
                  value={values.shortDescUk}
                  onChange={(e) => set("shortDescUk", e.target.value)}
                />
              </Field>
              <Field label="Opis (EN)" htmlFor="descriptionEn">
                <RichTextEditor
                  key={`en-${editorKey}`}
                  id="descriptionEn"
                  value={values.descriptionEn}
                  onChange={(html) => set("descriptionEn", html)}
                />
              </Field>
              <Field label="Opis (UK)" htmlFor="descriptionUk">
                <RichTextEditor
                  key={`uk-${editorKey}`}
                  id="descriptionUk"
                  value={values.descriptionUk}
                  onChange={(html) => set("descriptionUk", html)}
                />
              </Field>
              <Field label="Składniki (EN)" htmlFor="ingredientsEn" className="sm:col-span-2">
                <TextArea
                  id="ingredientsEn"
                  value={values.ingredientsEn}
                  onChange={(e) => set("ingredientsEn", e.target.value)}
                />
              </Field>
            </div>
          </details>
        </div>

        <aside className="space-y-6">
          <Section title="Status">
            <Segmented
              label="Status produktu"
              value={values.status}
              onChange={(v) => set("status", v)}
              options={[
                { value: "ACTIVE", label: "Aktywny", dot: "bg-success" },
                { value: "DRAFT", label: "Szkic", dot: "bg-warning" },
                { value: "ARCHIVED", label: "Archiwum", dot: "bg-muted-foreground" },
              ]}
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              {values.status === "ACTIVE"
                ? "Widoczny w sklepie."
                : values.status === "DRAFT"
                  ? "Niewidoczny dla klientów — do dopracowania."
                  : "Wycofany ze sprzedaży, ukryty w sklepie."}
            </p>
            <div className="divide-y divide-border/70 border-t border-border/70 pt-1">
              <Switch
                label="Wyróżniony"
                description="Sekcja polecanych na stronie głównej"
                checked={values.isFeatured}
                onChange={(v) => set("isFeatured", v)}
              />
              <Switch
                label="Nowość"
                checked={values.isNewArrival}
                onChange={(v) => set("isNewArrival", v)}
              />
              <Switch
                label="W kreatorze zestawów"
                description="Klient może dodać go do własnego zestawu prezentowego"
                checked={values.isGiftEligible}
                onChange={(v) => set("isGiftEligible", v)}
              />
              <Switch
                label="W Google Shopping"
                description="Wysyłany do Google Merchant Center"
                checked={values.isInGoogleFeed}
                onChange={(v) => set("isInGoogleFeed", v)}
              />
            </div>
          </Section>

          <section className="rounded-2xl bg-card p-5 shadow-card">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">Kompletność</h2>
              <span className="text-sm font-semibold tabular-nums">{completeness.score}%</span>
            </div>
            <div className="mb-3 h-1.5 rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                  completeness.score === 100
                    ? "bg-success"
                    : completeness.score >= 70
                      ? "bg-primary"
                      : "bg-warning",
                )}
                style={{ width: `${completeness.score}%` }}
              />
            </div>
            <ul className="space-y-0.5">
              {completeness.checks.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(SECTION_FOR_CHECK[c.key] ?? "opis")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted"
                  >
                    {c.ok ? (
                      <Check className="size-4 shrink-0 text-success" aria-label="Uzupełnione" />
                    ) : (
                      <X className="size-4 shrink-0 text-muted-foreground" aria-label="Brak" />
                    )}
                    <span className={cn(c.ok ? "text-muted-foreground" : "font-medium")}>
                      {c.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <Section id="organizacja" title="Organizacja">
            <Field
              label="Kategoria główna"
              htmlFor="categoryId"
              hint="Decyduje o ścieżce (breadcrumbs) i adresie kanonicznym."
            >
              <SearchSelect
                id="categoryId"
                value={values.categoryId}
                onChange={(v) => set("categoryId", v)}
                options={categoryOptions}
                placeholder="Wybierz kategorię"
                searchPlaceholder="Szukaj kategorii…"
                createLabel="Utwórz kategorię"
                onCreate={(name) => execSaveCategory({ slug: slugify(name), namePl: name })}
              />
            </Field>
            <Field label="Marka" htmlFor="brandId">
              <SearchSelect
                id="brandId"
                value={values.brandId}
                onChange={(v) => set("brandId", v)}
                options={localBrands}
                placeholder="Wybierz markę"
                searchPlaceholder="Szukaj marki…"
                createLabel="Utwórz markę"
                onCreate={(name) => execSaveBrand({ slug: slugify(name), name })}
              />
            </Field>
            <Field label="Dodatkowe kategorie" hint="Produkt pojawi się też w tych kategoriach.">
              <MultiPicker
                values={values.extraCategoryIds.filter((id) => id !== values.categoryId)}
                onChange={(v) => set("extraCategoryIds", v)}
                options={categoryOptions.filter((o) => o.id !== values.categoryId)}
                addLabel="Dodaj kategorię"
                searchPlaceholder="np. na sen, dla kobiet…"
              />
            </Field>
            <Field label="Tagi">
              <MultiPicker
                values={values.tagIds}
                onChange={(v) => set("tagIds", v)}
                options={tagOptions}
                addLabel="Dodaj tag"
                searchPlaceholder="Szukaj tagów…"
                emptyHint="Brak tagów — utwórz je w Katalog → Tagi."
              />
            </Field>
          </Section>

          <Section title="Adres strony">
            <Field
              label="Slug"
              htmlFor="slug"
              error={errors.slug}
              hint={
                product && values.slug !== baseline.slug
                  ? "Zmiana adresu: stary link przestanie działać, jeśli nie ma przekierowania."
                  : slugManual
                    ? undefined
                    : "Tworzony automatycznie z nazwy."
              }
            >
              <div className="flex items-center overflow-hidden rounded-lg border border-border bg-muted/60 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
                <span className="pl-3 text-xs text-muted-foreground">/produkt/</span>
                <input
                  id="slug"
                  value={values.slug}
                  aria-invalid={!!errors.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    // Light normalization only — full slugify would eat a trailing "-" mid-typing
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  className="h-9 min-w-0 flex-1 bg-background px-2 font-mono text-xs outline-none"
                />
              </div>
            </Field>
            {product?.status === "ACTIVE" && (
              <a
                href={`/produkt/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="-mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Otwórz w sklepie
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}
