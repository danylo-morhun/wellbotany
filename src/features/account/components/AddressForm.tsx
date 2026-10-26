"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { FieldError, FormError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import { formatPostalCode } from "@/lib/postal-code";
import { saveAddress } from "../actions";
import type { AddressInput } from "../schema";

type Props = {
  initial?: Partial<AddressInput> & { id?: string };
  onDone: () => void;
};

const EMPTY: AddressInput = {
  firstName: "",
  lastName: "",
  company: "",
  street: "",
  apartment: "",
  city: "",
  postalCode: "",
  phone: "",
  type: "shipping",
  isDefault: false,
};

export function AddressForm({ initial, onDone }: Props) {
  const [form, setForm] = useState<AddressInput & { id?: string }>({
    ...EMPTY,
    ...initial,
  });

  const { execute, isPending, result, hasErrored } = useAction(saveAddress, {
    onSuccess: onDone,
  });

  const error = result?.serverError ?? (hasErrored ? "Wystąpił błąd" : null);
  const fieldErrors = result?.validationErrors;
  const errors = {
    firstName: fieldErrors?.firstName?._errors?.[0],
    lastName: fieldErrors?.lastName?._errors?.[0],
    street: fieldErrors?.street?._errors?.[0],
    postalCode: fieldErrors?.postalCode?._errors?.[0],
    city: fieldErrors?.city?._errors?.[0],
    phone: fieldErrors?.phone?._errors?.[0],
  };
  const a11y = {
    firstName: fieldA11y("addr-firstName", errors.firstName),
    lastName: fieldA11y("addr-lastName", errors.lastName),
    street: fieldA11y("addr-street", errors.street),
    postalCode: fieldA11y("addr-postalCode", errors.postalCode),
    city: fieldA11y("addr-city", errors.city),
    phone: fieldA11y("addr-phone", errors.phone),
  };

  function update(field: keyof AddressInput) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    execute(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-medium">{form.id ? "Edytuj adres" : "Nowy adres"}</h3>

      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="addr-firstName">
            Imię
          </label>
          <input
            {...a11y.firstName.inputProps}
            autoComplete="given-name"
            type="text"
            required
            value={form.firstName}
            onChange={update("firstName")}
            className={inputClass}
          />
          <FieldError id={a11y.firstName.errorId} message={errors.firstName} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="addr-lastName">
            Nazwisko
          </label>
          <input
            {...a11y.lastName.inputProps}
            autoComplete="family-name"
            type="text"
            required
            value={form.lastName}
            onChange={update("lastName")}
            className={inputClass}
          />
          <FieldError id={a11y.lastName.errorId} message={errors.lastName} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="addr-company">
          Firma (opcjonalnie)
        </label>
        <input
          id="addr-company"
          autoComplete="organization"
          type="text"
          value={form.company ?? ""}
          onChange={update("company")}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="addr-street">
          Ulica i numer
        </label>
        <input
          {...a11y.street.inputProps}
          autoComplete="address-line1"
          type="text"
          required
          value={form.street}
          onChange={update("street")}
          className={inputClass}
        />
        <FieldError id={a11y.street.errorId} message={errors.street} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="addr-apartment">
          Numer lokalu (opcjonalnie)
        </label>
        <input
          id="addr-apartment"
          autoComplete="address-line2"
          type="text"
          value={form.apartment ?? ""}
          onChange={update("apartment")}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="addr-postalCode">
            Kod pocztowy
          </label>
          <input
            {...a11y.postalCode.inputProps}
            autoComplete="postal-code"
            type="text"
            inputMode="numeric"
            required
            placeholder="00-000"
            pattern="\d{2}-\d{3}"
            title="Format: 00-000"
            maxLength={6}
            value={form.postalCode}
            onChange={(e) =>
              setForm((p) => ({ ...p, postalCode: formatPostalCode(e.target.value) }))
            }
            className={inputClass}
          />
          <FieldError id={a11y.postalCode.errorId} message={errors.postalCode} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="addr-city">
            Miasto
          </label>
          <input
            {...a11y.city.inputProps}
            autoComplete="address-level2"
            type="text"
            required
            value={form.city}
            onChange={update("city")}
            className={inputClass}
          />
          <FieldError id={a11y.city.errorId} message={errors.city} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="addr-phone">
          Telefon (opcjonalnie)
        </label>
        <input
          {...a11y.phone.inputProps}
          autoComplete="tel"
          type="tel"
          value={form.phone ?? ""}
          onChange={update("phone")}
          className={inputClass}
        />
        <FieldError id={a11y.phone.errorId} message={errors.phone} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
        />
        Ustaw jako domyślny
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
        >
          {isPending ? "Zapisywanie..." : "Zapisz"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}
