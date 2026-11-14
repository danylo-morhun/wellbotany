"use client";

import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { FormError, inputClass } from "@/components/ui/field";
import { loginCustomer } from "../actions";

type Props = { callbackUrl?: string };

export function LoginForm({ callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  // Admin accounts: after the password the action asks for the TOTP code
  const [needsCode, setNeedsCode] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (needsCode) codeRef.current?.focus();
  }, [needsCode]);

  const { execute, isPending, hasErrored, result } = useAction(loginCustomer, {
    onSuccess: ({ data }) => {
      if (data?.needsCode) setNeedsCode(true);
    },
  });

  const error =
    result?.serverError ??
    result?.validationErrors?.code?._errors?.[0] ??
    (hasErrored ? "Wystąpił błąd" : null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute({ email, password, callbackUrl, code: needsCode ? code : undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError message={error} />

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium" htmlFor="password">
            Hasło
          </label>
          <a href="/kontakt" className="text-xs text-primary hover:underline">
            Nie pamiętasz hasła?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      </div>

      {needsCode && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="totp-code">
            Kod z aplikacji uwierzytelniającej
          </label>
          <input
            id="totp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{3} ?\d{3}"
            maxLength={7}
            required
            ref={codeRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} tracking-[0.3em]`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            6 cyfr z Google Authenticator, Authy lub innej aplikacji, w której dodano Well Botany.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {isPending ? "Logowanie..." : "Zaloguj się"}
      </button>
    </form>
  );
}
