"use client";

import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

type SheetContentProps = {
  children: React.ReactNode;
  className?: string;
  side?: "right" | "left";
};

export function SheetContent({ children, className, side = "right" }: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ease-out-strong data-[ending-style]:opacity-0 data-[ending-style]:duration-200 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
      <Dialog.Popup
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-full flex-col bg-background shadow-xl outline-none",
          // Enter on the spring; exit quicker on ease-out so dismissal feels immediate
          "transition-transform spring data-[ending-style]:duration-200 data-[ending-style]:ease-out-strong motion-reduce:transition-none",
          side === "right" &&
            "right-0 border-l border-border sm:max-w-sm data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
          side === "left" &&
            "left-0 border-r border-border sm:max-w-sm data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full",
          className,
        )}
      >
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export function SheetHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("border-t border-border px-6 py-4", className)}>{children}</div>;
}
