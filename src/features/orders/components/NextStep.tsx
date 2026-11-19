import type { OrderStatus } from "@prisma/client";
import { AlertTriangle, FileDown, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/app/admin/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { NOT_HANDED_OVER, PACKAGE_STATUS_LABELS } from "@/features/shipping/lib/shipment-status";
import { MarkPaidButton } from "./MarkPaidButton";
import { StatusActionButton } from "./StatusActionButton";

type Props = {
  order: {
    id: string;
    status: OrderStatus;
    shippingMethod: string;
    paymentMethod: string;
    isPaid: boolean;
    epakaOrderId: number | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shipmentStatus: string | null;
    shipmentAlert: string | null;
  };
  /** Shipped by epaka (paczkomat, Orlen, courier) — false for pickup and manual carriers */
  viaEpaka: boolean;
  /** The epaka label form, shown while the label is the next step */
  labelForm: ReactNode;
};

const linkButton = (variant: "default" | "outline" = "outline") =>
  buttonVariants({ variant, size: "lg" });

/**
 * The one thing to do with this order now, with its button(s). Statuses can
 * still be set by hand in "Notatka i status" for anything unusual.
 */
export function NextStep({ order, viaEpaka, labelForm }: Props) {
  const { id, status } = order;
  if (status === "CANCELLED" || status === "REFUNDED") return null;

  const isPickup = order.shippingMethod === "PICKUP";
  const payAtPickup = order.paymentMethod === "CASH_ON_DELIVERY";
  const packingList = (
    <a
      href={`/admin/zamowienia/druk?ids=${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={linkButton()}
    >
      <Printer aria-hidden />
      Lista pakowania
    </a>
  );
  const labelPdf = order.epakaOrderId && (
    <a
      href={`/admin/zamowienia/${id}/etykieta`}
      target="_blank"
      rel="noopener noreferrer"
      className={linkButton("default")}
    >
      <FileDown aria-hidden />
      Etykieta (PDF)
    </a>
  );
  const tracking = order.trackingNumber && (
    <p className="text-sm">
      Przesyłka{" "}
      {order.trackingUrl ? (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {order.trackingNumber}
        </a>
      ) : (
        <span className="font-medium">{order.trackingNumber}</span>
      )}
      {order.shipmentStatus && (
        <span className="text-muted-foreground">
          {" "}
          · {PACKAGE_STATUS_LABELS[order.shipmentStatus] ?? order.shipmentStatus}
        </span>
      )}
    </p>
  );

  let title: string;
  let hint: ReactNode = null;
  let body: ReactNode = null;
  let actions: ReactNode = null;

  if (!order.isPaid && !payAtPickup && (status === "PENDING" || status === "PAYMENT_PENDING")) {
    title = "Czeka na płatność";
    hint =
      order.paymentMethod === "BANK_TRANSFER"
        ? "Gdy przelew wpłynie na konto, oznacz zamówienie jako opłacone — wtedy można je pakować."
        : "Płatność online jeszcze nie dotarła. Status zmieni się sam po potwierdzeniu.";
    actions = order.paymentMethod === "BANK_TRANSFER" && <MarkPaidButton orderId={id} />;
  } else if (isPickup && (status === "PAID" || status === "PROCESSING")) {
    title = "Przygotuj zamówienie do odbioru";
    hint = "Zbierz produkty według listy. Klient dostanie e-mail, że może przyjść.";
    actions = (
      <>
        {packingList}
        <StatusActionButton
          orderId={id}
          status="SHIPPED"
          label="Gotowe do odbioru"
          confirm={{
            title: "Zamówienie gotowe do odbioru?",
            description: "Klient dostanie e-mail, że może odebrać zamówienie w sklepie.",
          }}
        />
      </>
    );
  } else if (isPickup && status === "SHIPPED") {
    title = "Czeka na odbiór w sklepie";
    hint = payAtPickup && !order.isPaid ? "Płatność przy odbiorze — pobierz należność." : null;
    actions = (
      <>
        {payAtPickup && !order.isPaid && <MarkPaidButton orderId={id} />}
        <StatusActionButton orderId={id} status="DELIVERED" label="Odebrane" />
      </>
    );
  } else if (viaEpaka && !order.epakaOrderId && (status === "PAID" || status === "PROCESSING")) {
    title = "Spakuj i utwórz etykietę";
    hint = "Zbierz produkty według listy, sprawdź wymiary paczki i utwórz przesyłkę w epaka.";
    actions = packingList;
    body = labelForm;
  } else if (order.epakaOrderId && (status === "PAID" || status === "PROCESSING")) {
    title = "Wydrukuj etykietę i nadaj paczkę";
    hint =
      "Naklej etykietę na paczkę i nadaj ją. Status zmieni się na „Wysłane” sam, gdy przewoźnik zeskanuje paczkę — albo oznacz go od razu.";
    body = tracking;
    actions = (
      <>
        {labelPdf}
        {packingList}
        {order.trackingNumber && (
          <StatusActionButton
            orderId={id}
            status="SHIPPED"
            label="Wysłane"
            variant="outline"
            confirm={{
              title: "Oznaczyć jako wysłane?",
              description: "Klient dostanie e-mail z numerem przesyłki.",
            }}
          />
        )}
      </>
    );
  } else if (!isPickup && (status === "PAID" || status === "PROCESSING")) {
    // Carrier outside epaka — shipped by hand, tracking number typed in below
    title = "Spakuj i wyślij";
    hint = "Po nadaniu wpisz numer przesyłki w „Notatka i status” i zmień status na „Wysłane”.";
    actions = packingList;
  } else if (status === "SHIPPED") {
    title = "W drodze do klienta";
    hint = order.epakaOrderId
      ? "Status „Dostarczone” ustawi się sam, gdy przewoźnik potwierdzi doręczenie."
      : null;
    body = tracking;
    actions = (
      <>
        {labelPdf}
        <StatusActionButton orderId={id} status="DELIVERED" label="Dostarczone" variant="outline" />
      </>
    );
  } else if (status === "DELIVERED") {
    title = isPickup ? "Odebrane — zamówienie zakończone" : "Doręczone — zamówienie zakończone";
    body = tracking;
  } else {
    return null;
  }

  return (
    <Panel title="Następny krok">
      {order.shipmentAlert && (
        <div className="mb-4 flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">
              {PACKAGE_STATUS_LABELS[order.shipmentAlert] ?? order.shipmentAlert}
            </span>
            {order.shipmentAlert === NOT_HANDED_OVER
              ? " — etykieta jest gotowa, ale przewoźnik nie zeskanował jeszcze paczki."
              : " — sprawdź przesyłkę w epaka i skontaktuj się z klientem."}
          </p>
        </div>
      )}
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      {body && <div className="mt-4">{body}</div>}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </Panel>
  );
}
