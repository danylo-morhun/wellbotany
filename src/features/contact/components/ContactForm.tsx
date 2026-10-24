"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { PrivacyNote } from "@/components/PrivacyNote";
import { sendContactMessage } from "../actions";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const { execute, isExecuting } = useAction(sendContactMessage, {
    onSuccess: () => {
      setSent(true);
      toast.success("Wiadomość wysłana", {
        description: "Odpowiemy w ciągu jednego dnia roboczego.",
        duration: 4000,
      });
    },
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się wysłać wiadomości. Spróbuj ponownie." });
    },
  });

  if (sent) {
    return (
      <div className="rounded-xl bg-card p-6 text-center shadow-card animate-pop-in motion-reduce:animate-none">
        <p className="text-sm font-semibold text-primary">✓ Dziękujemy za wiadomość</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Odpowiemy na podany adres e-mail w ciągu jednego dnia roboczego.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        execute({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          subject: String(data.get("subject") ?? ""),
          message: String(data.get("message") ?? ""),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Imię i nazwisko
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            className={inputClass}
            placeholder="Jan Kowalski"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Adres e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="jan@example.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium">
          Temat
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={3}
          className={inputClass}
          placeholder="Zapytanie o zamówienie"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium">
          Wiadomość
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          className={inputClass}
          placeholder="Opisz swoje pytanie…"
        />
      </div>
      <button
        type="submit"
        disabled={isExecuting}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-200 hover:bg-primary-deep active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span
          key={isExecuting ? "loading" : "idle"}
          className="inline-block animate-[btn-text-in_200ms_ease-out_both] motion-reduce:animate-none"
        >
          {isExecuting ? "Wysyłanie…" : "Wyślij wiadomość"}
        </span>
      </button>
      <PrivacyNote purpose="Dane przetwarzamy, aby odpowiedzieć na Twoją wiadomość." />
    </form>
  );
}
