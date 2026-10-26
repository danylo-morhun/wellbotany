"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type RefObject, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PrivacyNote } from "@/components/PrivacyNote";
import { FieldError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import type { CheckoutFormData } from "./CheckoutForm";
import { FakturaFields, validateNip } from "./FakturaFields";

const schema = z.object({
  firstName: z.string().min(2, "Min. 2 znaki"),
  lastName: z.string().min(2, "Min. 2 znaki"),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  phone: z.string().regex(/^[+\d\s-]{9,15}$/, "Nieprawidłowy numer telefonu"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onNext: () => void;
};

export function StepContact({ headingRef, data, onChange, onNext }: Props) {
  const [nipError, setNipError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
    },
  });

  // Typed values reach the parent as they change, so the saved draft keeps them
  useEffect(() => {
    const subscription = watch((values) => onChange(values));
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const onSubmit = (values: FormValues) => {
    // Faktura fields are controlled by the parent, outside react-hook-form
    if (data.wantsFaktura && !validateNip(data.billNip)) {
      setNipError("Nieprawidłowy NIP");
      document.getElementById("billNip")?.focus();
      return;
    }
    onChange(values);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
        Dane kontaktowe
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="co-firstName" className="mb-1 block text-sm font-medium">
            Imię *
          </label>
          <input
            {...register("firstName")}
            {...fieldA11y("co-firstName", errors.firstName?.message).inputProps}
            autoComplete="given-name"
            className={inputClass}
          />
          <FieldError id="co-firstName-error" message={errors.firstName?.message} />
        </div>
        <div>
          <label htmlFor="co-lastName" className="mb-1 block text-sm font-medium">
            Nazwisko *
          </label>
          <input
            {...register("lastName")}
            {...fieldA11y("co-lastName", errors.lastName?.message).inputProps}
            autoComplete="family-name"
            className={inputClass}
          />
          <FieldError id="co-lastName-error" message={errors.lastName?.message} />
        </div>
      </div>

      <div>
        <label htmlFor="co-email" className="mb-1 block text-sm font-medium">
          Adres e-mail *
        </label>
        <input
          {...register("email")}
          {...fieldA11y("co-email", errors.email?.message).inputProps}
          type="email"
          autoComplete="email"
          className={inputClass}
        />
        <FieldError id="co-email-error" message={errors.email?.message} />
      </div>

      <div>
        <label htmlFor="co-phone" className="mb-1 block text-sm font-medium">
          Telefon *
        </label>
        <input
          {...register("phone")}
          {...fieldA11y("co-phone", errors.phone?.message).inputProps}
          type="tel"
          autoComplete="tel"
          className={inputClass}
        />
        <FieldError id="co-phone-error" message={errors.phone?.message} />
      </div>

      <FakturaFields
        data={data}
        onChange={onChange}
        nipError={nipError}
        onNipChange={() => setNipError(null)}
      />

      <PrivacyNote purpose="Dane przetwarzamy, aby zrealizować zamówienie, dostarczyć je i wystawić dowód zakupu." />

      <button
        type="submit"
        className="mt-2 w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
      >
        Dalej: Dostawa →
      </button>
    </form>
  );
}
