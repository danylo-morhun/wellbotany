"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Side sheet holding one edit form — same layout as the variant editor (header, scrolling body, sticky save bar). */
export function FormSheet({
  title,
  description,
  onClose,
  onSubmit,
  pending,
  submitLabel = "Zapisz",
  wide,
  dirty,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel?: string;
  /** For long forms (SEO texts, FAQ) */
  wide?: boolean;
  /** Edits made outside native inputs (pickers, uploads); native input edits are tracked automatically */
  dirty?: boolean;
  children: React.ReactNode;
}) {
  // Any input/change event bubbling up from the form counts as an edit
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const hasEdits = touched || !!dirty;

  function requestClose() {
    if (hasEdits && !pending) setConfirming(true);
    else onClose();
  }

  return (
    <Sheet open onOpenChange={(open) => !open && requestClose()}>
      <SheetContent className={cn("w-full overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <form
          onSubmit={onSubmit}
          onChange={() => setTouched(true)}
          className="flex min-h-full flex-col"
        >
          <div className="border-b border-border px-6 py-4">
            <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
            {description && (
              <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </div>
          <div className="flex-1 space-y-5 px-6 py-5">{children}</div>
          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-6 py-4">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Zapisywanie…" : submitLabel}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={requestClose}>
              Anuluj
            </Button>
          </div>
        </form>
      </SheetContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Odrzucić zmiany?"
        description="Masz niezapisane zmiany w tym formularzu. Po zamknięciu zostaną utracone."
        confirmLabel="Odrzuć zmiany"
        onConfirm={() => {
          setConfirming(false);
          onClose();
        }}
      />
    </Sheet>
  );
}
