"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CheckoutFormData } from "./CheckoutForm";

const schema = z.object({
  firstName: z.string().min(2, "Min. 2 znaki"),
  lastName: z.string().min(2, "Min. 2 znaki"),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  phone: z.string().regex(/^[+\d\s-]{9,15}$/, "Nieprawidłowy numer telefonu"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onNext: () => void;
};

export function StepContact({ data, onChange, onNext }: Props) {
  const {
    register,
    handleSubmit,
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

  const onSubmit = (values: FormValues) => {
    onChange(values);
    onNext();
  };

  const inputClass =
    "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-semibold">Dane kontaktowe</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="co-firstName" className="mb-1 block text-sm font-medium">
            Imię *
          </label>
          <input
            id="co-firstName"
            {...register("firstName")}
            autoComplete="given-name"
            className={inputClass}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="co-lastName" className="mb-1 block text-sm font-medium">
            Nazwisko *
          </label>
          <input
            id="co-lastName"
            {...register("lastName")}
            autoComplete="family-name"
            className={inputClass}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="co-email" className="mb-1 block text-sm font-medium">
          Adres e-mail *
        </label>
        <input
          id="co-email"
          {...register("email")}
          type="email"
          autoComplete="email"
          className={inputClass}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="co-phone" className="mb-1 block text-sm font-medium">
          Telefon *
        </label>
        <input
          id="co-phone"
          {...register("phone")}
          type="tel"
          autoComplete="tel"
          className={inputClass}
        />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
      >
        Dalej: Dostawa →
      </button>
    </form>
  );
}
