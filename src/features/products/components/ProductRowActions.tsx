"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProduct } from "../actions";

interface Props {
  productId: string;
  productName: string;
  slug: string;
  /** Only an active product has a public page */
  isActive: boolean;
}

/** "⋯" menu for a product row: edit, open in shop, delete (with confirmation) */
export function ProductRowActions({ productId, productName, slug, isActive }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { execute, isPending } = useAction(deleteProduct, {
    onSuccess: () => {
      router.refresh();
      toast.success(`Usunięto: ${productName}`);
    },
    onError: ({ error }) => {
      // Close the confirmation — the toast says why nothing was deleted
      setOpen(false);
      toast.error(error?.serverError ?? "Błąd usuwania produktu");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Akcje dla ${productName}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted aria-expanded:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => router.push(`/admin/produkty/${productId}`)}>
            Edytuj
          </DropdownMenuItem>
          {isActive && (
            <DropdownMenuItem onClick={() => window.open(`/produkt/${slug}`, "_blank", "noopener")}>
              Zobacz w sklepie
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onClick={() => setOpen(true)}>
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń produkt</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć „{productName}"? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => execute({ id: productId })}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Usuwanie…" : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
