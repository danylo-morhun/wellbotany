"use client";

import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { loginCustomer } from "../actions";

type Props = { callbackUrl?: string };

export function LoginForm({ callbackUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { execute, isPending, hasErrored, result } = useAction(loginCustomer);

  const error = result?.serverError ?? (hasErrored ? "Wystąpił błąd" : null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute({ email, password, callbackUrl });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

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
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
