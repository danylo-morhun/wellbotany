"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type RefObject, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PrivacyNote } from "@/components/PrivacyNote";
import { FieldError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import type { CheckoutFormData } from "./CheckoutForm";
import {
  FAKTURA_FIELDS,
  type FakturaErrors,
  FakturaFields,
  validateFaktura,
} from "./FakturaFields";

// Empty, too short and wrong format each get their own message
const schema = z.object({
  firstName: z.string().trim().min(1, "Podaj imię").min(2, "Imię musi mieć co najmniej 2 znaki"),
  lastName: z
    .string()
    .trim()
    .min(1, "Podaj nazwisko")
    .min(2, "Nazwisko musi mieć co najmniej 2 znaki"),
  email: z
    .string()
    .trim()
    .min(1, "Podaj adres e-mail")
    .email("Wpisz adres e-mail w formacie nazwa@domena.pl"),
  phone: z
    .string()
    .trim()
    .min(1, "Podaj numer telefonu")
    .regex(/^[+\d\s-]{9,15}$/, "Wpisz numer telefonu, np. 600 123 456"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onNext: () => void;
};

export function StepContact({ headingRef, data, onChange, onNext }: Props) {
  // Invoice fields live in the parent state, outside react-hook-form; checked
  // on submit, then live while the shopper corrects them
  const [fakturaChecked, setFakturaChecked] = useState(false);
  const fakturaErrors: FakturaErrors = fakturaChecked ? validateFaktura(data) : {};
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
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

  const firstFakturaError = () => {
    const errors = validateFaktura(data);
    return FAKTURA_FIELDS.find((f) => errors[f]);
  };

  const onValid = (values: FormValues) => {
    const invalid = firstFakturaError();
    if (invalid) {
      document.getElementById(invalid)?.focus();
      return;
    }
    onChange(values);
    onNext();
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        setFakturaChecked(true);
        // react-hook-form focuses its own first invalid field; invoice errors show alongside
        void handleSubmit(onValid)(e);
      }}
      className="space-y-4"
    >
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
            aria-required
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
            aria-required
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
          aria-required
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
          aria-required
          {...fieldA11y("co-phone", errors.phone?.message).inputProps}
          type="tel"
          autoComplete="tel"
          className={inputClass}
        />
        <FieldError id="co-phone-error" message={errors.phone?.message} />
      </div>

      <FakturaFields data={data} onChange={onChange} errors={fakturaErrors} />

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
