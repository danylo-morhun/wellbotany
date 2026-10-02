"use client";

import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { subscribeToNewsletter } from "../actions";
import { WELCOME_DISCOUNT_PERCENT } from "../lib/constants";
import { markSubscribed } from "../lib/prompt-state";

type Props = {
  /** "band": dark homepage band; "card": light surface (the welcome prompt) */
  variant?: "band" | "card";
  onSubscribed?: () => void;
};

export function NewsletterForm({ variant = "band", onSubscribed }: Props) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const band = variant === "band";

  const { execute, isExecuting } = useAction(subscribeToNewsletter, {
    onSuccess: () => {
      setSubscribed(true);
      setEmail("");
      markSubscribed();
      onSubscribed?.();
    },
    onError: ({ error }) => {
      toast.error("Błąd", {
        description:
          error.validationErrors?.email?._errors?.[0] ??
          error.serverError ??
          "Spróbuj ponownie później",
      });
    },
  });

  if (subscribed) {
    return (
      <p
        role="status"
        className={cn(
          "mt-4 rounded-2xl px-5 py-3 text-sm font-medium animate-pop-in motion-reduce:animate-none",
          band ? "mx-auto mt-6 max-w-md bg-band-foreground/10" : "bg-primary/10 text-foreground",
        )}
      >
        ✓ Gotowe! Kod -{WELCOME_DISCOUNT_PERCENT}% wysłaliśmy na Twój e-mail — sprawdź też folder
        Oferty lub Spam.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        execute({ email });
      }}
      className={cn("flex flex-col gap-2 sm:flex-row", band ? "mx-auto mt-6 max-w-md" : "mt-4")}
    >
      <label htmlFor={inputId} className="sr-only">
        Adres e-mail
      </label>
      <input
        id={inputId}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="twoj@email.pl"
        className={cn(
          "min-w-0 flex-1 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2",
          band
            ? "border border-band-foreground/25 bg-band-foreground/10 text-band-foreground placeholder:text-band-foreground/60 focus:border-transparent focus:ring-band-foreground/60"
            : "border border-input bg-background placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20",
        )}
      />
      <button
        type="submit"
        disabled={isExecuting}
        className={cn(
          "rounded-full px-6 py-3 text-sm font-semibold transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
          band
            ? "bg-band-foreground text-band hover:bg-secondary"
            : "bg-primary text-primary-foreground hover:bg-primary-deep",
        )}
      >
        <span
          key={isExecuting ? "loading" : "idle"}
          className="animate-[btn-text-in_200ms_ease-out_both] motion-reduce:animate-none"
        >
          {isExecuting ? "Zapisywanie…" : `Odbierz -${WELCOME_DISCOUNT_PERCENT}%`}
        </span>
      </button>
    </form>
  );
}
