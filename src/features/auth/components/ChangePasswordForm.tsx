"use client";

import { useAction } from "next-safe-action/hooks";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Section, TextInput } from "@/features/products/components/editor/fields";
import { changeAdminPassword } from "../password-actions";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { execute, isPending, result } = useAction(changeAdminPassword, {
    onSuccess: () => {
      toast.success("Hasło zmienione");
      formRef.current?.reset();
    },
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
  });
  const errors = result?.validationErrors;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execute({
      currentPassword: String(fd.get("currentPassword") ?? ""),
      newPassword: String(fd.get("newPassword") ?? ""),
      confirmPassword: String(fd.get("confirmPassword") ?? ""),
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 max-w-2xl">
      <Section title="Twoje hasło" description="Hasło do panelu dla zalogowanego konta.">
        <div className="space-y-4">
          <Field label="Obecne hasło" htmlFor="currentPassword">
            <TextInput
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field
            label="Nowe hasło"
            htmlFor="newPassword"
            hint="Co najmniej 12 znaków"
            error={errors?.newPassword?._errors?.[0]}
          >
            <TextInput
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <Field
            label="Powtórz nowe hasło"
            htmlFor="confirmPassword"
            error={errors?.confirmPassword?._errors?.[0]}
          >
            <TextInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Zapisywanie…" : "Zmień hasło"}
          </Button>
        </div>
      </Section>
    </form>
  );
}
