"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  inputClass,
  Segmented,
  TextInput,
} from "@/features/products/components/editor/fields";
import { cn } from "@/lib/utils";
import { createEpakaShipment, refreshEpakaShipment } from "../actions";
import type { SenderPoint } from "../lib/epaka";
import type { CreateEpakaShipmentInput } from "../schema";

type Receiver = CreateEpakaShipmentInput["receiver"];
type Pkg = CreateEpakaShipmentInput["package"];

type Props = {
  orderId: string;
  epakaOrderId: number | null;
  trackingNumber: string | null;
  epakaReady: boolean;
  receiver: Receiver;
  /** Where the parcel can be dropped off in the shop's city */
  senderPoints: SenderPoint[];
  defaultPackage: Pkg;
};

const RECEIVER_FIELDS: { key: keyof Receiver; label: string; wide?: boolean }[] = [
  { key: "firstName", label: "Imię" },
  { key: "lastName", label: "Nazwisko" },
  { key: "company", label: "Firma", wide: true },
  { key: "street", label: "Ulica", wide: true },
  { key: "houseNumber", label: "Nr domu" },
  { key: "flatNumber", label: "Nr lokalu" },
  { key: "postCode", label: "Kod pocztowy" },
  { key: "city", label: "Miasto" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-mail" },
  { key: "pointId", label: "Punkt odbioru", wide: true },
];

const PACKAGE_FIELDS: { key: keyof Pkg; label: string }[] = [
  { key: "weight", label: "Waga kg" },
  { key: "length", label: "Dł. cm" },
  { key: "width", label: "Szer. cm" },
  { key: "height", label: "Wys. cm" },
];

/** Creates the shipment in epaka for this order, then links the label PDF. */
export function EpakaShipmentPanel({
  orderId,
  epakaOrderId,
  trackingNumber,
  epakaReady,
  receiver: initialReceiver,
  senderPoints,
  defaultPackage,
}: Props) {
  const [receiver, setReceiver] = useState(initialReceiver);
  const [pkg, setPkg] = useState<Record<keyof Pkg, string>>({
    weight: String(defaultPackage.weight),
    length: String(defaultPackage.length),
    width: String(defaultPackage.width),
    height: String(defaultPackage.height),
  });
  const [mode, setMode] = useState<"pickup" | "dropOff">("dropOff");
  const [senderPointId, setSenderPointId] = useState(senderPoints[0]?.id ?? "");

  const create = useAction(createEpakaShipment, {
    onSuccess: ({ data }) =>
      toast.success("Przesyłka utworzona w epaka", {
        description: data?.trackingNumber
          ? `Numer: ${data.trackingNumber}`
          : (data?.message ?? "Numer przesyłki pojawi się za chwilę"),
      }),
    onError: ({ error }) =>
      toast.error("epaka", {
        description: error.serverError ?? "Sprawdź dane odbiorcy i paczki — formularz ma błędy",
      }),
  });
  const refresh = useAction(refreshEpakaShipment, {
    onSuccess: ({ data }) =>
      data?.trackingNumber
        ? toast.success(`Numer przesyłki: ${data.trackingNumber}`)
        : toast.info("epaka nie nadała jeszcze numeru"),
    onError: ({ error }) => toast.error("epaka", { description: error.serverError }),
  });

  if (epakaOrderId) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          Zamówienie epaka <span className="font-medium tabular-nums">#{epakaOrderId}</span>
        </p>
        {!trackingNumber && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refresh.isPending}
            onClick={() => refresh.execute({ orderId })}
          >
            {refresh.isPending ? "Sprawdzanie…" : "Pobierz numer przesyłki"}
          </Button>
        )}
        <a
          href={`/admin/zamowienia/${orderId}/etykieta`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm" })}
        >
          Pobierz etykietę (PDF)
        </a>
        <p className="text-xs text-muted-foreground">
          Po nadaniu paczki zmień status na „Wysłane” — klient dostanie e-mail z numerem.
        </p>
      </div>
    );
  }

  if (!epakaReady) {
    return (
      <p className="text-sm text-muted-foreground">
        Integracja z epaka nie jest skonfigurowana (EPAKA_CLIENT_ID, EPAKA_CLIENT_SECRET).
      </p>
    );
  }

  function submit() {
    const numbers = Object.fromEntries(
      Object.entries(pkg).map(([k, v]) => [k, Number(v.replace(",", "."))]),
    ) as Pkg;
    const senderPoint = senderPoints.find((p) => p.id === senderPointId);
    if (mode === "dropOff" && !senderPoint) {
      toast.error("Wybierz punkt nadania");
      return;
    }
    if (!window.confirm("Utworzyć przesyłkę w epaka? Koszt zostanie pobrany z salda epaka.")) {
      return;
    }
    create.execute({
      orderId,
      receiver: {
        ...receiver,
        company: receiver.company || undefined,
        flatNumber: receiver.flatNumber || undefined,
        pointId: receiver.pointId || undefined,
      },
      package: numbers,
      senderPoint: mode === "dropOff" ? senderPoint : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {RECEIVER_FIELDS.filter((f) => f.key !== "pointId" || initialReceiver.pointId).map((f) => (
          <Field
            key={f.key}
            label={f.label}
            htmlFor={`epaka-${f.key}`}
            className={f.wide ? "col-span-2" : undefined}
          >
            <TextInput
              id={`epaka-${f.key}`}
              value={receiver[f.key] ?? ""}
              onChange={(e) => setReceiver((r) => ({ ...r, [f.key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PACKAGE_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`epaka-pkg-${f.key}`}>
            <TextInput
              id={`epaka-pkg-${f.key}`}
              inputMode="decimal"
              value={pkg[f.key]}
              onChange={(e) => setPkg((p) => ({ ...p, [f.key]: e.target.value }))}
              className="tabular-nums"
            />
          </Field>
        ))}
      </div>

      <Segmented
        label="Sposób nadania"
        value={mode}
        onChange={setMode}
        options={[
          { value: "dropOff", label: "Nadam w punkcie" },
          { value: "pickup", label: "Kurier odbierze" },
        ]}
      />
      {mode === "dropOff" && (
        <Field
          label="Punkt nadania"
          htmlFor="epaka-senderPoint"
          hint={
            senderPoints.length === 0
              ? "epaka nie zwróciła punktów nadania — odśwież stronę."
              : "Tu zostawisz paczkę."
          }
        >
          <select
            id="epaka-senderPoint"
            value={senderPointId}
            onChange={(e) => setSenderPointId(e.target.value)}
            className={cn(inputClass, "h-9")}
          >
            {senderPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.description}
              </option>
            ))}
          </select>
        </Field>
      )}
      {mode === "pickup" && (
        <p className="text-xs text-muted-foreground">
          Kurier przyjedzie w najbliższym terminie, jaki poda epaka. Paczkomaty, Orlen, InPost
          Kurier, GLS, Pocztex i Poczta Polska nie odbierają paczek — dla nich wybierz punkt.
        </p>
      )}

      <Button type="button" disabled={create.isPending} onClick={submit} className="w-full">
        {create.isPending ? "Tworzenie przesyłki…" : "Nadaj przez epaka"}
      </Button>
    </div>
  );
}
