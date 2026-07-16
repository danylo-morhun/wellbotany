"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import type { CartItem } from "@/features/cart/lib/session";
import { placeOrder } from "../actions";
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
  shippingMethod: "INPOST_PACZKOMAT" | "DHL" | "DPD";
  inpostMachineId: string;
  inpostMachineName: string;
  wantsFaktura: boolean;
  billCompany: string;
  billNip: string;
  billStreet: string;
  billCity: string;
  billPostalCode: string;
  paymentMethod: "BLIK" | "PRZELEWY24" | "APPLE_PAY" | "GOOGLE_PAY";
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
  wantsFaktura: false,
  billCompany: "",
  billNip: "",
  billStreet: "",
  billCity: "",
  billPostalCode: "",
  paymentMethod: "BLIK",
  couponCode: "",
  acceptedTerms: false,
};

const STEP_LABELS = ["Kontakt", "Dostawa", "Płatność"];

type Props = {
  cartId: string;
  items: CartItem[];
  subtotal: number;
};

export function CheckoutForm({ cartId, items, subtotal }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CheckoutFormData>(INITIAL_DATA);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const { execute, isPending } = useAction(placeOrder, {
    onSuccess: ({ data }) => {
      if (data?.redirectUrl) {
        setRedirecting(true);
        window.location.href = data.redirectUrl;
      } else if (data?.orderNumber) {
        router.push(`/zamowienie/potwierdzenie/${data.orderNumber}`);
      }
    },
    onError: ({ error: actionError }) => {
      const msg =
        actionError.serverError ?? actionError.validationErrors?._errors?.[0] ?? "Wystąpił błąd";
      const msgStr = typeof msg === "string" ? msg : "Wystąpił błąd. Spróbuj ponownie.";
      setError(msgStr);
      toast.error("Błąd zamówienia", { description: msgStr });
    },
  });

  function update(updates: Partial<CheckoutFormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function handlePlaceOrder() {
    setError(null);
    execute({
      cartId,
      email: formData.email,
      phone: formData.phone,
      firstName: formData.firstName,
      lastName: formData.lastName,
      street: formData.street,
      apartment: formData.apartment || undefined,
      city: formData.city,
      postalCode: formData.postalCode,
      shippingMethod: formData.shippingMethod,
      inpostMachineId: formData.inpostMachineId || undefined,
      inpostMachineName: formData.inpostMachineName || undefined,
      wantsFaktura: formData.wantsFaktura,
      billCompany: formData.billCompany || undefined,
      billNip: formData.billNip || undefined,
      billStreet: formData.billStreet || undefined,
      billCity: formData.billCity || undefined,
      billPostalCode: formData.billPostalCode || undefined,
      paymentMethod: formData.paymentMethod,
      couponCode: formData.couponCode || undefined,
      acceptedTerms: formData.acceptedTerms,
    });
  }

  return (
    <div className="relative">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </div>
              <span className={`text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="mx-1 h-px w-8 bg-border" />}
            </div>
          );
        })}
      </div>

      {step === 1 && <StepContact data={formData} onChange={update} onNext={() => setStep(2)} />}
      {step === 2 && (
        <StepShipping
          data={formData}
          onChange={update}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepPayment
          data={formData}
          onChange={update}
          onBack={() => setStep(2)}
          onSubmit={handlePlaceOrder}
          items={items}
          subtotal={subtotal}
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
