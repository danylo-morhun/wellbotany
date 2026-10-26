"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import { headerIconClass } from "./header-icon";

/** Phones have no room for the header search field: an icon opens it in a
 * panel under the top edge. */
export function MobileSearch() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Szukaj" className={`${headerIconClass} md:hidden`}>
        <Search className="size-5" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed inset-x-0 top-0 z-50 bg-background px-4 py-3 shadow-float outline-none">
          <Dialog.Title className="sr-only">Szukaj produktów</Dialog.Title>
          <div className="flex items-start gap-2">
            <HeaderSearch className="flex-1" autoFocus onNavigate={() => setOpen(false)} />
            <Dialog.Close aria-label="Zamknij" className={headerIconClass}>
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
