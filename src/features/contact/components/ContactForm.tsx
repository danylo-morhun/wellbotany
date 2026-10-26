"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { PrivacyNote } from "@/components/PrivacyNote";
import { FieldError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import { sendContactMessage } from "../actions";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const { execute, isExecuting, result } = useAction(sendContactMessage, {
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

  const fieldErrors = result?.validationErrors;
  const errors = {
    name: fieldErrors?.name?._errors?.[0],
    email: fieldErrors?.email?._errors?.[0],
    subject: fieldErrors?.subject?._errors?.[0],
    message: fieldErrors?.message?._errors?.[0],
  };
  const a11y = {
    name: fieldA11y("name", errors.name),
    email: fieldA11y("email", errors.email),
    subject: fieldA11y("subject", errors.subject),
    message: fieldA11y("message", errors.message),
  };

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
            {...a11y.name.inputProps}
            autoComplete="name"
            name="name"
            type="text"
            required
            minLength={2}
            className={inputClass}
            placeholder="Jan Kowalski"
          />
          <FieldError id={a11y.name.errorId} message={errors.name} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Adres e-mail
          </label>
          <input
            {...a11y.email.inputProps}
            autoComplete="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="jan@example.com"
          />
          <FieldError id={a11y.email.errorId} message={errors.email} />
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium">
          Temat
        </label>
        <input
          {...a11y.subject.inputProps}
          name="subject"
          type="text"
          required
          minLength={3}
          className={inputClass}
          placeholder="Zapytanie o zamówienie"
        />
        <FieldError id={a11y.subject.errorId} message={errors.subject} />
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium">
          Wiadomość
        </label>
        <textarea
          {...a11y.message.inputProps}
          name="message"
          rows={5}
          required
          minLength={10}
          className={inputClass}
          placeholder="Opisz swoje pytanie…"
        />
        <FieldError id={a11y.message.errorId} message={errors.message} />
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
