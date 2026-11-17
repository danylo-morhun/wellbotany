"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  merchantId: number;
  orderNumber: string;
  email: string;
  deliveryCountry: string;
  deliveryDate: string;
};

type Gapi = {
  load: (module: string, callback: () => void) => void;
  surveyoptin: { render: (options: Record<string, unknown>) => void };
};

declare global {
  interface Window {
    ___gcfg?: { lang: string };
    renderOptIn?: () => void;
    gapi?: Gapi;
  }
}

// Google's script loads only after the click: until then Google gets nothing
// (no order number, no access to its cookies) — the privacy policy promises it.
export function GoogleReviewsOptIn({
  merchantId,
  orderNumber,
  email,
  deliveryCountry,
  deliveryDate,
}: Props) {
  const [opened, setOpened] = useState(false);

  function open() {
    setOpened(true);
    window.___gcfg = { lang: "pl" };
    window.renderOptIn = () =>
      window.gapi?.load("surveyoptin", () =>
        window.gapi?.surveyoptin.render({
          merchant_id: merchantId,
          order_id: orderNumber,
          email,
          delivery_country: deliveryCountry,
          estimated_delivery_date: deliveryDate,
          opt_in_style: "CENTER_DIALOG",
        }),
      );
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    script.async = true;
    document.body.appendChild(script);
  }

  return (
    <div className="mt-6 space-y-3 rounded-2xl bg-card p-6 text-sm shadow-card">
      <h2 className="font-semibold">Oceń zakupy w Google</h2>
      <p className="text-muted-foreground">
        Po dostawie Google może wysłać Ci krótką ankietę o zakupach w Well Botany. Twoja ocena
        pomoże innym klientom.
      </p>
      {!opened && (
        <button
          type="button"
          onClick={open}
          className="rounded-lg border border-border px-4 py-2 font-medium transition-colors duration-150 hover:bg-secondary motion-reduce:transition-none"
        >
          Oceń zakupy w Google
        </button>
      )}
      <p className="text-xs text-muted-foreground">
        Po kliknięciu Google wyświetli okno z prośbą o zgodę i otrzyma numer zamówienia, e-mail,
        kraj i przewidywaną datę dostawy.{" "}
        <Link href="/polityka-prywatnosci" className="underline hover:text-foreground">
          Więcej
        </Link>
      </p>
    </div>
  );
}
