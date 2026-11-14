"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { FormError, inputClass } from "@/components/ui/field";
import { confirmTotpSetup, startTotpSetup } from "../totp-actions";

const buttonClass =
  "w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";

export function TotpSetup() {
  const [code, setCode] = useState("");
  const start = useAction(startTotpSetup);
  const confirm = useAction(confirmTotpSetup);
  const setup = start.result.data;

  const error =
    start.result.serverError ??
    confirm.result.serverError ??
    confirm.result.validationErrors?.code?._errors?.[0] ??
    (start.hasErrored || confirm.hasErrored ? "Wystąpił błąd" : null);

  if (!setup) {
    return (
      <div className="space-y-4">
        <FormError message={error} />
        <button
          type="button"
          onClick={() => start.execute()}
          disabled={start.isPending}
          className={buttonClass}
        >
          {start.isPending ? "Generowanie…" : "Pokaż kod QR"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        confirm.execute({ code });
      }}
      className="space-y-5"
    >
      <FormError message={error} />
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Otwórz aplikację uwierzytelniającą i dodaj konto, skanując kod QR.</li>
        <li>Wpisz poniżej 6 cyfr, które pokaże aplikacja.</li>
      </ol>
      {/* biome-ignore lint/performance/noImgElement: data: URL generated on the server, not an optimizable asset */}
      <img
        src={setup.qr}
        alt="Kod QR do aplikacji uwierzytelniającej"
        width={240}
        height={240}
        className="mx-auto rounded-lg bg-white p-2"
      />
      <p className="text-center text-xs text-muted-foreground">
        Nie możesz zeskanować? Wpisz klucz ręcznie:
        <br />
        <code className="select-all font-mono text-sm text-foreground">{setup.secret}</code>
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="totp-confirm">
          Kod z aplikacji
        </label>
        <input
          id="totp-confirm"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{3} ?\d{3}"
          maxLength={7}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${inputClass} tracking-[0.3em]`}
        />
      </div>
      <button type="submit" disabled={confirm.isPending} className={buttonClass}>
        {confirm.isPending ? "Sprawdzanie…" : "Włącz i zaloguj się ponownie"}
      </button>
    </form>
  );
}
