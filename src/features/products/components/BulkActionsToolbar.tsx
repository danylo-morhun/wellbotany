"use client";

import type { ProductStatus } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  bulkAssignBrand,
  bulkAssignCategory,
  bulkDeleteProducts,
  bulkUpdateProductStatus,
} from "../actions";
import type { ProductFilters } from "../lib/where";

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "DRAFT", label: "Szkic" },
  { value: "ACTIVE", label: "Aktywny" },
  { value: "ARCHIVED", label: "Zarchiwizowany" },
];

type Selection = { mode: "ids" | "all"; ids: string[]; excludedIds: string[] };

type PendingAction =
  | { type: "status"; status: ProductStatus; label: string }
  | { type: "brand"; brandId: string | null; label: string }
  | { type: "category"; categoryId: string | null; label: string }
  | { type: "delete" }
  | { type: "delete-conflict"; conflictCount: number; deletableCount: number };

type Props = {
  count: number;
  selection: Selection;
  filters: ProductFilters;
  brands: { id: string; name: string }[];
  categories: { id: string; namePl: string }[];
  onClear: () => void;
  onDone: () => void;
};

export function BulkActionsToolbar({
  count,
  selection,
  filters,
  brands,
  categories,
  onClear,
  onDone,
}: Props) {
  const [pending, setPending] = useState<PendingAction | null>(null);

  const selectionPayload = { ...selection, filters };

  const statusAction = useAction(bulkUpdateProductStatus, {
    onSuccess: ({ data }) => {
      toast.success(`Zmieniono status ${data?.count ?? 0} produktów`);
      onDone();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zmiany statusu"),
  });

  const brandAction = useAction(bulkAssignBrand, {
    onSuccess: ({ data }) => {
      toast.success(`Przypisano markę do ${data?.count ?? 0} produktów`);
      onDone();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd przypisania marki"),
  });

  const categoryAction = useAction(bulkAssignCategory, {
    onSuccess: ({ data }) => {
      toast.success(`Przypisano kategorię do ${data?.count ?? 0} produktów`);
      onDone();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd przypisania kategorii"),
  });

  const deleteAction = useAction(bulkDeleteProducts, {
    onSuccess: ({ data }) => {
      if (data?.requiresConfirmation) {
        setPending({
          type: "delete-conflict",
          conflictCount: data.conflictCount ?? 0,
          deletableCount: data.deletableCount ?? 0,
        });
        return;
      }
      toast.success(`Usunięto ${data?.deletedCount ?? 0} produktów`);
      onDone();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania produktów"),
  });

  const isPending =
    statusAction.isPending ||
    brandAction.isPending ||
    categoryAction.isPending ||
    deleteAction.isPending;

  function confirmPending() {
    if (!pending) return;
    if (pending.type === "status") {
      statusAction.execute({ ...selectionPayload, status: pending.status });
    } else if (pending.type === "brand") {
      brandAction.execute({ ...selectionPayload, brandId: pending.brandId });
    } else if (pending.type === "category") {
      categoryAction.execute({ ...selectionPayload, categoryId: pending.categoryId });
    } else if (pending.type === "delete") {
      deleteAction.execute({ ...selectionPayload, skipConflicts: false });
    } else if (pending.type === "delete-conflict") {
      deleteAction.execute({ ...selectionPayload, skipConflicts: true });
    }
    setPending(null);
  }

  if (count === 0) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background">
        <span className="text-sm font-medium">Zaznaczono: {count}</span>
        <div className="mx-2 h-5 w-px bg-background/20" />

        <select
          disabled={isPending}
          value=""
          onChange={(e) => {
            const status = e.target.value as ProductStatus;
            const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
            setPending({ type: "status", status, label });
          }}
          className="rounded-lg border border-background/30 bg-transparent px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Zmień status…
          </option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value} className="text-foreground">
              {s.label}
            </option>
          ))}
        </select>

        <select
          disabled={isPending}
          value=""
          onChange={(e) => {
            const brandId = e.target.value;
            if (!brandId) return;
            const label =
              brandId === "__none__"
                ? "— Brak marki —"
                : (brands.find((b) => b.id === brandId)?.name ?? brandId);
            setPending({ type: "brand", brandId: brandId === "__none__" ? null : brandId, label });
          }}
          className="rounded-lg border border-background/30 bg-transparent px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Przypisz markę…
          </option>
          <option value="__none__" className="text-foreground">
            — Brak marki —
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id} className="text-foreground">
              {b.name}
            </option>
          ))}
        </select>

        <select
          disabled={isPending}
          value=""
          onChange={(e) => {
            const categoryId = e.target.value;
            if (!categoryId) return;
            const label =
              categoryId === "__none__"
                ? "— Brak kategorii —"
                : (categories.find((c) => c.id === categoryId)?.namePl ?? categoryId);
            setPending({
              type: "category",
              categoryId: categoryId === "__none__" ? null : categoryId,
              label,
            });
          }}
          className="rounded-lg border border-background/30 bg-transparent px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Przypisz kategorię…
          </option>
          <option value="__none__" className="text-foreground">
            — Brak kategorii —
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id} className="text-foreground">
              {c.namePl}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={isPending}
          onClick={() => setPending({ type: "delete" })}
          className="rounded-lg border border-destructive/60 px-2 py-1 text-sm text-destructive-foreground hover:bg-destructive/20"
        >
          Usuń
        </button>

        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-sm underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Wyczyść zaznaczenie
        </button>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending?.type === "status" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Zmienić status</AlertDialogTitle>
                <AlertDialogDescription>
                  Zmienić status {count} produktów na „{pending.label}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={confirmPending}>Potwierdź</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {pending?.type === "brand" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Przypisać markę</AlertDialogTitle>
                <AlertDialogDescription>
                  Przypisać „{pending.label}" jako markę dla {count} produktów?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={confirmPending}>Potwierdź</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {pending?.type === "category" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Przypisać kategorię</AlertDialogTitle>
                <AlertDialogDescription>
                  Przypisać „{pending.label}" jako kategorię dla {count} produktów?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={confirmPending}>Potwierdź</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {pending?.type === "delete" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunąć produkty</AlertDialogTitle>
                <AlertDialogDescription>
                  Czy na pewno chcesz usunąć {count} produktów? Tej operacji nie można cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {pending?.type === "delete-conflict" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Część produktów ma zamówienia</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.conflictCount} z {pending.conflictCount + pending.deletableCount}{" "}
                  zaznaczonych produktów ma przypisane zamówienia i nie można ich usunąć. Usunąć
                  pozostałe {pending.deletableCount}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Usuń {pending.deletableCount}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
