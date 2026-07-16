"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { registerCustomer } from "../actions";

export function RegisterForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });

  const { execute, isPending, hasErrored, result } = useAction(registerCustomer);

  const serverError = result?.serverError ?? (hasErrored ? "Wystąpił błąd" : null);
  const fieldErrors = result?.validationErrors;

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
            Imię
          </label>
          <input
            id="firstName"
            type="text"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={update("firstName")}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {fieldErrors?.firstName?._errors?.[0] && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.firstName._errors[0]}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
            Nazwisko
          </label>
          <input
            id="lastName"
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
        <label className="mb-1 block text-sm font-medium" htmlFor="reg-email">
          E-mail
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {fieldErrors?.email?._errors?.[0] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.email._errors[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="reg-password">
          Hasło
        </label>
        <input
          id="reg-password"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {fieldErrors?.password?._errors?.[0] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.password._errors[0]}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="confirmPassword">
          Powtórz hasło
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update("confirmPassword")}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {fieldErrors?.confirmPassword?._errors?.[0] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword._errors[0]}</p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            Akceptuję{" "}
            <a href="/regulamin" className="underline hover:text-foreground">
              regulamin
            </a>{" "}
            i{" "}
            <a href="/polityka-prywatnosci" className="underline hover:text-foreground">
              politykę prywatności
            </a>
          </span>
        </label>
        {fieldErrors?.acceptedTerms?._errors?.[0] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.acceptedTerms._errors[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !form.acceptedTerms}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {isPending ? "Rejestracja..." : "Zarejestruj się"}
      </button>
    </form>
  );
}
