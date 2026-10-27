"use client";

import { FieldError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import { formatPostalCode } from "@/lib/postal-code";
import type { CheckoutFormData } from "./CheckoutForm";

export function validateNip(nip: string): boolean {
  const digits = nip.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  return sum % 11 === parseInt(digits[9], 10);
}

/** Field ids in visual order, so the first invalid one can take focus. */
export const FAKTURA_FIELDS = [
  "billCompany",
  "billNip",
  "billStreet",
  "billPostalCode",
  "billCity",
] as const;
export type FakturaErrors = Partial<Record<(typeof FAKTURA_FIELDS)[number], string>>;

/** Same rules the server applies to the invoice fields, plus the NIP checksum. */
export function validateFaktura(data: CheckoutFormData): FakturaErrors {
  if (!data.wantsFaktura) return {};
  const errors: FakturaErrors = {};
  if (!data.billCompany.trim()) errors.billCompany = "Podaj nazwę firmy";
  if (!data.billNip.trim()) errors.billNip = "Podaj NIP";
  else if (!validateNip(data.billNip)) errors.billNip = "Nieprawidłowy NIP — sprawdź cyfry";
  if (!data.billStreet.trim()) errors.billStreet = "Podaj ulicę i numer";
  if (!data.billPostalCode.trim()) errors.billPostalCode = "Podaj kod pocztowy";
  else if (!/^\d{2}-\d{3}$/.test(data.billPostalCode))
    errors.billPostalCode = "Wpisz kod w formacie 00-000";
  if (!data.billCity.trim()) errors.billCity = "Podaj miasto";
  return errors;
}

type Props = {
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  errors: FakturaErrors;
};

/** "Chcę fakturę VAT" checkbox with the company fields it reveals. */
export function FakturaFields({ data, onChange, errors }: Props) {
  const company = fieldA11y("billCompany", errors.billCompany);
  const nip = fieldA11y("billNip", errors.billNip);
  const street = fieldA11y("billStreet", errors.billStreet);
  const postal = fieldA11y("billPostalCode", errors.billPostalCode);
  const city = fieldA11y("billCity", errors.billCity);
  return (
    <>
      <div className="border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={data.wantsFaktura}
            onChange={(e) => onChange({ wantsFaktura: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-sm font-medium">Chcę fakturę VAT</span>
        </label>
      </div>

      {data.wantsFaktura && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Dane do faktury</h3>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billCompany">
              Nazwa firmy *
            </label>
            <input
              {...company.inputProps}
              type="text"
              autoComplete="billing organization"
              aria-required
              value={data.billCompany}
              onChange={(e) => onChange({ billCompany: e.target.value })}
              className={inputClass}
            />
            <FieldError id={company.errorId} message={errors.billCompany} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billNip">
              NIP (10 cyfr) *
            </label>
            <input
              {...nip.inputProps}
              type="text"
              aria-required
              maxLength={10}
              inputMode="numeric"
              value={data.billNip}
              onChange={(e) => onChange({ billNip: e.target.value.replace(/\D/g, "") })}
              className={inputClass}
            />
            <FieldError id={nip.errorId} message={errors.billNip} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billStreet">
              Ulica i numer *
            </label>
            <input
              {...street.inputProps}
              type="text"
              autoComplete="billing address-line1"
              aria-required
              value={data.billStreet}
              onChange={(e) => onChange({ billStreet: e.target.value })}
              className={inputClass}
            />
            <FieldError id={street.errorId} message={errors.billStreet} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billPostalCode">
                Kod pocztowy *
              </label>
              <input
                {...postal.inputProps}
                type="text"
                inputMode="numeric"
                autoComplete="billing postal-code"
                aria-required
                placeholder="00-000"
                maxLength={6}
                value={data.billPostalCode}
                onChange={(e) => onChange({ billPostalCode: formatPostalCode(e.target.value) })}
                className={inputClass}
              />
              <FieldError id={postal.errorId} message={errors.billPostalCode} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billCity">
                Miasto *
              </label>
              <input
                {...city.inputProps}
                type="text"
                autoComplete="billing address-level2"
                aria-required
                value={data.billCity}
                onChange={(e) => onChange({ billCity: e.target.value })}
                className={inputClass}
              />
              <FieldError id={city.errorId} message={errors.billCity} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
