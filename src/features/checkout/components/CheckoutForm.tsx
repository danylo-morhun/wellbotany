"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { readFbc } from "@/components/MetaClickId";
import { clearSavedCoupon } from "@/features/cart/lib/saved-coupon";
import type { CartItem } from "@/features/cart/lib/session";
import type { TierPromo } from "@/features/promotions/lib/tiered";
import { trackItems } from "@/lib/analytics";
import { hasMarketingConsent } from "@/lib/consent";
import type { PickupLocationKey } from "@/lib/pickup-locations";
import { placeOrder } from "../actions";
import { clearDraft, readDraft, saveDraft } from "../lib/draft";
import { isOfflinePayment } from "../lib/payment";
import { requiresAddress, type ShippingMethodKey, type ShippingRate } from "../lib/shipping";
import { OrderSummarySidebar } from "./OrderSummarySidebar";
import { StepContact } from "./StepContact";
import { StepPayment } from "./StepPayment";
import { StepShipping } from "./StepShipping";

export type CheckoutFormData = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  street: string;
  apartment: string;
  city: string;
  postalCode: string;
  shippingMethod: ShippingMethodKey;
  inpostMachineId: string;
  inpostMachineName: string;
  pickupLocation: PickupLocationKey | "";
  wantsFaktura: boolean;
  billCompany: string;
  billNip: string;
  billStreet: string;
  billCity: string;
  billPostalCode: string;
  paymentMethod:
    | "BLIK"
    | "PRZELEWY24"
    | "APPLE_PAY"
    | "GOOGLE_PAY"
    | "BANK_TRANSFER"
    | "CASH_ON_DELIVERY";
  couponCode: string;
  acceptedTerms: boolean;
};

const INITIAL_DATA: CheckoutFormData = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  street: "",
  apartment: "",
  city: "",
  postalCode: "",
  shippingMethod: "INPOST_PACZKOMAT",
  inpostMachineId: "",
  inpostMachineName: "",
  pickupLocation: "",
  wantsFaktura: false,
  billCompany: "",
  billNip: "",
  billStreet: "",
  billCity: "",
  billPostalCode: "",
  paymentMethod: "BANK_TRANSFER",
  couponCode: "",
  acceptedTerms: false,
};

/** First message from a next-safe-action validation error tree (root or any field). */
function firstValidationMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const { _errors, ...fields } = errors as { _errors?: unknown };
  if (Array.isArray(_errors) && typeof _errors[0] === "string") return _errors[0];
  for (const value of Object.values(fields)) {
    const message = firstValidationMessage(value);
    if (message) return message;
  }
  return undefined;
}

const STEP_LABELS = ["Kontakt", "Dostawa", "Płatność"];

type InitialContact = Pick<
  CheckoutFormData,
  "email" | "firstName" | "lastName" | "phone" | "street" | "apartment" | "city" | "postalCode"
>;

type Props = {
  cartId: string;
  items: CartItem[];
  subtotal: number;
  freeShippingThresholdPln: number | null;
  /** Live cart promotion, if any */
  promo: TierPromo | null;
  /** Enabled methods, cheapest first */
  shippingRates: ShippingRate[];
  onlinePaymentsEnabled: boolean;
  initialContact?: InitialContact;
};

export function CheckoutForm({
  cartId,
  items,
  subtotal,
  freeShippingThresholdPln,
  promo,
  shippingRates,
  onlinePaymentsEnabled,
  initialContact,
}: Props) {
  const router = useRouter();

  // biome-ignore lint/correctness/useExhaustiveDependencies: once per checkout visit
  useEffect(() => {
    trackItems(
      "begin_checkout",
      items.map((item) => ({
        itemId: item.variant.product.id,
        itemName: item.variant.product.namePl,
        itemVariant: item.variant.optionValue,
        pricePln: item.unitPriceOverridePln ?? item.variant.pricePln,
        quantity: item.quantity,
      })),
    );
  }, []);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CheckoutFormData>({
    ...INITIAL_DATA,
    shippingMethod: shippingRates[0]?.method ?? INITIAL_DATA.shippingMethod,
    ...initialContact,
  });
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Bumped when a draft is restored, so StepContact remounts with the restored values
  const [draftKey, setDraftKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChangedByUser = useRef(false);

  // sessionStorage exists only in the browser, so the draft is restored after mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: once on mount
  useEffect(() => {
    const draft = readDraft(cartId, INITIAL_DATA);
    if (draft) {
      const { shippingMethod, paymentMethod } = draft.data;
      let restoredStep = draft.step;
      // Methods may have been switched off since the draft was saved
      if (shippingMethod && !shippingRates.some((r) => r.method === shippingMethod)) {
        delete draft.data.shippingMethod;
        delete draft.data.inpostMachineId;
        delete draft.data.inpostMachineName;
        // The address or point belonged to that method — let the shopper choose again
        restoredStep = Math.min(restoredStep, 2);
      }
      if (paymentMethod && !onlinePaymentsEnabled && !isOfflinePayment(paymentMethod)) {
        delete draft.data.paymentMethod;
      }
      setFormData((prev) => ({ ...prev, ...draft.data }));
      setStep(restoredStep);
      setDraftKey((k) => k + 1);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(cartId, step, formData);
  }, [hydrated, cartId, step, formData]);

  // Focus follows the step the shopper moved to (not the first render or a restore)
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each step change
  useEffect(() => {
    if (!stepChangedByUser.current) return;
    stepChangedByUser.current = false;
    headingRef.current?.focus();
  }, [step]);

  function goToStep(n: number) {
    stepChangedByUser.current = true;
    setStep(n);
  }

  const { execute, isPending } = useAction(placeOrder, {
    onSuccess: ({ data }) => {
      clearSavedCoupon();
      clearDraft();
      if (data?.redirectUrl) {
        setRedirecting(true);
        window.location.href = data.redirectUrl;
      } else if (data?.orderNumber) {
        router.push(`/zamowienie/potwierdzenie/${data.orderNumber}`);
      }
    },
    onError: ({ error: actionError }) => {
      const msgStr =
        actionError.serverError ??
        firstValidationMessage(actionError.validationErrors) ??
        "Wystąpił błąd. Spróbuj ponownie.";
      setError(msgStr);
      toast.error("Błąd zamówienia", { description: msgStr });
    },
  });

  const update = useCallback((updates: Partial<CheckoutFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  function handlePlaceOrder() {
    setError(null);
    const hasAddress = requiresAddress(formData.shippingMethod);
    execute({
      cartId,
      email: formData.email,
      phone: formData.phone,
      firstName: formData.firstName,
      lastName: formData.lastName,
      street: hasAddress ? formData.street : undefined,
      apartment: hasAddress ? formData.apartment || undefined : undefined,
      city: hasAddress ? formData.city : undefined,
      postalCode: hasAddress ? formData.postalCode : undefined,
      shippingMethod: formData.shippingMethod,
      inpostMachineId: formData.inpostMachineId || undefined,
      inpostMachineName: formData.inpostMachineName || undefined,
      pickupLocation: formData.pickupLocation || undefined,
      wantsFaktura: formData.wantsFaktura,
      billCompany: formData.billCompany || undefined,
      billNip: formData.billNip || undefined,
      billStreet: formData.billStreet || undefined,
      billCity: formData.billCity || undefined,
      billPostalCode: formData.billPostalCode || undefined,
      paymentMethod: formData.paymentMethod,
      couponCode: formData.couponCode || undefined,
      acceptedTerms: formData.acceptedTerms,
      // Cookie banner choice: the server sends the Meta purchase event only with it
      ...(hasMarketingConsent() && { marketingConsent: true, fbc: readFbc() }),
    });
  }

  return (
    <div className="relative">
      {/* Step indicator */}
      <nav aria-label="Etapy zamówienia" className="mb-8">
        <ol className="flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <li
                key={label}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "border border-primary bg-background text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </span>
                {/* Mobile has no room for three labels — it shows only the active one */}
                <span
                  className={`text-sm ${active ? "font-semibold" : "sr-only text-muted-foreground sm:not-sr-only"}`}
                >
                  <span className="sr-only">Krok {n}: </span>
                  {label}
                  {done && <span className="sr-only"> (ukończony)</span>}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <span aria-hidden className="mx-1 h-px w-4 bg-border sm:w-8" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {(step === 1 || step === 2) && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {step === 1 && (
            <StepContact
              key={draftKey}
              headingRef={headingRef}
              data={formData}
              onChange={update}
              onNext={() => goToStep(2)}
            />
          )}
          {step === 2 && (
            <StepShipping
              headingRef={headingRef}
              data={formData}
              subtotal={subtotal}
              freeShippingThresholdPln={freeShippingThresholdPln}
              shippingRates={shippingRates}
              onChange={update}
              onBack={() => goToStep(1)}
              onNext={() => goToStep(3)}
            />
          )}
          <OrderSummarySidebar items={items} subtotal={subtotal} />
        </div>
      )}
      {step === 3 && (
        <StepPayment
          headingRef={headingRef}
          data={formData}
          onChange={update}
          onBack={() => goToStep(2)}
          onSubmit={handlePlaceOrder}
          items={items}
          subtotal={subtotal}
          freeShippingThresholdPln={freeShippingThresholdPln}
          promo={promo}
          shippingRates={shippingRates}
          onlinePaymentsEnabled={onlinePaymentsEnabled}
          pending={isPending || redirecting}
          error={error}
        />
      )}

      {redirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Przekierowuję do płatności…</p>
          </div>
        </div>
      )}
    </div>
  );
}
