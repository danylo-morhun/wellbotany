"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { updateProfile } from "../actions";

type Props = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export function ProfileForm({ firstName, lastName, phone, email }: Props) {
  const [form, setForm] = useState({ firstName, lastName, phone });
  const [saved, setSaved] = useState(false);

  const { execute, isPending, result, hasErrored } = useAction(updateProfile, {
    onSuccess: () => setSaved(true),
  });

  const error = result?.serverError ?? (hasErrored ? "Wystąpił błąd" : null);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaved(false);
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute(form);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Profil</h1>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">
          Zmiany zapisane.
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="pf-email">
          E-mail
        </label>
        <input
          id="pf-email"
          type="email"
          disabled
          value={email}
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="pf-firstName">
            Imię
          </label>
          <input
            id="pf-firstName"
            type="text"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={update("firstName")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="pf-lastName">
            Nazwisko
          </label>
          <input
            id="pf-lastName"
            type="text"
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={update("lastName")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="pf-phone">
          Telefon
        </label>
        <input
          id="pf-phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={update("phone")}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
      >
        {isPending ? "Zapisywanie..." : "Zapisz zmiany"}
      </button>
    </form>
  );
}
