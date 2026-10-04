"use client";

import type { CheckoutFormData } from "./CheckoutForm";

export function validateNip(nip: string): boolean {
  const digits = nip.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  return sum % 11 === parseInt(digits[9], 10);
}

type Props = {
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  nipError: string | null;
  /** Called while the NIP is edited, so a stale checksum error disappears */
  onNipChange: () => void;
};

/** "Chcę fakturę VAT" checkbox with the company fields it reveals. */
export function FakturaFields({ data, onChange, nipError, onNipChange }: Props) {
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
              Nazwa firmy
            </label>
            <input
              id="billCompany"
              type="text"
              required
              value={data.billCompany}
              onChange={(e) => onChange({ billCompany: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billNip">
              NIP (10 cyfr)
            </label>
            <input
              id="billNip"
              type="text"
              required
              maxLength={10}
              value={data.billNip}
              onChange={(e) => {
                onChange({ billNip: e.target.value.replace(/\D/g, "") });
                onNipChange();
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {nipError && <p className="mt-1 text-xs text-destructive">{nipError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billStreet">
              Ulica i numer
            </label>
            <input
              id="billStreet"
              type="text"
              required
              value={data.billStreet}
              onChange={(e) => onChange({ billStreet: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billPostalCode">
                Kod pocztowy
              </label>
              <input
                id="billPostalCode"
                type="text"
                required
                placeholder="00-000"
                pattern="\d{2}-\d{3}"
                value={data.billPostalCode}
                onChange={(e) => onChange({ billPostalCode: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billCity">
                Miasto
              </label>
              <input
                id="billCity"
                type="text"
                required
                value={data.billCity}
                onChange={(e) => onChange({ billCity: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
