"use client";

import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { PrivacyNote } from "@/components/PrivacyNote";
import { FieldError, FormError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import { registerCustomer } from "../actions";

const STRENGTH_LABELS = ["Bardzo słabe", "Słabe", "Średnie", "Dobre", "Silne"];

function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, STRENGTH_LABELS.length - 1);
}

export function RegisterForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const { execute, isPending, hasErrored, result } = useAction(registerCustomer);

  const serverError = result?.serverError ?? (hasErrored ? "Wystąpił błąd" : null);
  const fieldErrors = result?.validationErrors;
  const errors = {
    firstName: fieldErrors?.firstName?._errors?.[0],
    lastName: fieldErrors?.lastName?._errors?.[0],
    email: fieldErrors?.email?._errors?.[0],
    password: fieldErrors?.password?._errors?.[0],
    confirmPassword: fieldErrors?.confirmPassword?._errors?.[0],
    acceptedTerms: fieldErrors?.acceptedTerms?._errors?.[0],
  };
  const a11y = {
    firstName: fieldA11y("firstName", errors.firstName),
    lastName: fieldA11y("lastName", errors.lastName),
    email: fieldA11y("reg-email", errors.email),
    password: fieldA11y("reg-password", errors.password),
    confirmPassword: fieldA11y("confirmPassword", errors.confirmPassword),
    acceptedTerms: fieldA11y("acceptedTerms", errors.acceptedTerms),
  };

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
      <FormError message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
            Imię
          </label>
          <input
            {...a11y.firstName.inputProps}
            type="text"
            required
            autoComplete="given-name"
            value={form.firstName}
            onChange={update("firstName")}
            className={inputClass}
          />
          <FieldError id={a11y.firstName.errorId} message={errors.firstName} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
            Nazwisko
          </label>
          <input
            {...a11y.lastName.inputProps}
            type="text"
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={update("lastName")}
            className={inputClass}
          />
          <FieldError id={a11y.lastName.errorId} message={errors.lastName} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="reg-email">
          E-mail
        </label>
        <input
          {...a11y.email.inputProps}
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          className={inputClass}
        />
        <FieldError id={a11y.email.errorId} message={errors.email} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="reg-password">
          Hasło
        </label>
        <div className="relative">
          <input
            {...a11y.password.inputProps}
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            className={`${inputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.password && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-1 flex-1 gap-1">
              {STRENGTH_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`h-full flex-1 rounded-full ${
                    i <= strength ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{STRENGTH_LABELS[strength]}</span>
          </div>
        )}
        <FieldError id={a11y.password.errorId} message={errors.password} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="confirmPassword">
          Powtórz hasło
        </label>
        <div className="relative">
          <input
            {...a11y.confirmPassword.inputProps}
            type={showConfirmPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            className={`${inputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? "Ukryj hasło" : "Pokaż hasło"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError id={a11y.confirmPassword.errorId} message={errors.confirmPassword} />
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            {...a11y.acceptedTerms.inputProps}
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) => setForm((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            Akceptuję{" "}
            <a href="/regulamin" className="underline hover:text-foreground">
              regulamin
            </a>
          </span>
        </label>
        <FieldError id={a11y.acceptedTerms.errorId} message={errors.acceptedTerms} />
      </div>

      <button
        type="submit"
        disabled={isPending || !form.acceptedTerms}
        className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {isPending ? "Rejestracja..." : "Zarejestruj się"}
      </button>
      <PrivacyNote purpose="Dane przetwarzamy, aby prowadzić Twoje konto." />
    </form>
  );
}
