"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      position="bottom-right"
      // Phones: lift toasts above the sticky add-to-cart bar
      mobileOffset={{ bottom: "5rem" }}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border border-border shadow-float",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          actionButton:
            "!bg-primary !text-primary-foreground !text-xs !font-medium !rounded-md !px-3 !py-1.5 hover:!bg-primary-deep !transition-colors",
        },
      }}
    />
  );
}
