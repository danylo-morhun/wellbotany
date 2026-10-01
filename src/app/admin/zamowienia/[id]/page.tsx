import { Check, Printer } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, CopyField } from "@/app/admin/components/CopyButton";
import { formatDateTime, OrderStatusBadge, PageHeader, Panel } from "@/app/admin/components/ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { shippingLabel } from "@/features/checkout/lib/shipping";
import { MarkPaidButton } from "@/features/orders/components/MarkPaidButton";
import { StatusForm } from "@/features/orders/components/StatusForm";
import { RequestReviewButton } from "@/features/reviews/components/RequestReviewButton";
import { formatPrice, pluralPl } from "@/lib/format";
import { pickupLocation } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { orderNumber: true } });
  return { title: order?.orderNumber ?? "Zamówienie" };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            select: {
              productId: true,
              product: {
                select: {
                  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const customerOrderCount = await prisma.order.count({
    where: { customerEmail: { equals: order.customerEmail, mode: "insensitive" } },
  });

  // Group gift-set component rows under their box label for packing clarity;
  // plain items ("" groupId) render individually, in original order.
  const seenGroups = new Set<string>();
  const orderedGroupIds: string[] = [];
  for (const item of order.items) {
    if (item.giftSetGroupId && !seenGroups.has(item.giftSetGroupId)) {
      seenGroups.add(item.giftSetGroupId);
      orderedGroupIds.push(item.giftSetGroupId);
    }
  }
  const itemRows = [
    ...order.items.filter((i) => !i.giftSetGroupId),
    ...orderedGroupIds.flatMap((groupId) =>
      order.items.filter((i) => i.giftSetGroupId === groupId),
    ),
  ];

  const isPaid = order.paymentStatus === "CAPTURED";
  const isPickup = order.shippingMethod === "PICKUP";
  const pickup = pickupLocation(order.pickupLocation);
  const recipient = `${order.shipFirstName} ${order.shipLastName}`.trim();
  const phone = order.shipPhone ?? order.customerPhone;
  const street = [order.shipStreet, order.shipApartment].filter(Boolean).join(" ");

  // One block to paste into carrier panels / notes
  const shippingBlock = [
    recipient,
    order.shipCompany,
    street,
    order.shipPostalCode && `${order.shipPostalCode} ${order.shipCity ?? ""}`.trim(),
    order.inpostMachineId && `Punkt: ${order.inpostMachineId}`,
    phone && `tel. ${phone}`,
    order.customerEmail,
  ]
    .filter(Boolean)
    .join("\n");

  const timeline: { label: string; at: Date | null; done?: boolean }[] = [
    { label: "Złożono zamówienie", at: order.createdAt },
    // Orders paid before paidAt was recorded have no timestamp — still show as done
    { label: "Opłacono", at: order.paidAt, done: isPaid },
    { label: isPickup ? "Gotowe do odbioru" : "Wysłano", at: order.shippedAt },
    { label: isPickup ? "Odebrano" : "Dostarczono", at: order.deliveredAt },
    { label: "Wysłano prośbę o opinię", at: order.reviewRequestedAt },
  ];

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/zamowienia", label: "Zamówienia" }}
        title={<span className="tabular-nums">{order.orderNumber}</span>}
        meta={
          <>
            <OrderStatusBadge status={order.status} shippingMethod={order.shippingMethod} />
            <Badge tone={isPaid ? "success" : "warning"}>
              {isPaid ? "Opłacone" : "Nieopłacone"}
            </Badge>
          </>
        }
        description={`${formatDateTime(order.createdAt)} · ${formatPrice(order.totalPln)}`}
        actions={
          <Link
            href={`/admin/zamowienia/druk?ids=${order.id}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Printer aria-hidden />
            Lista pakowania
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {order.noteCustomer?.trim() && (
            <div className="rounded-2xl bg-info/10 p-4 text-sm">
              <p className="mb-1 font-semibold text-info">Uwagi klienta</p>
              <p className="whitespace-pre-line">{order.noteCustomer}</p>
            </div>
          )}

          <Panel title={`Produkty (${order.items.reduce((s, i) => s + i.quantity, 0)} szt.)`}>
            <ul className="divide-y divide-border">
              {itemRows.map((item, i) => {
                const isFirstInGroup =
                  item.giftSetGroupId !== "" &&
                  (i === 0 || itemRows[i - 1].giftSetGroupId !== item.giftSetGroupId);
                const image = item.variant?.product.images[0]?.url;
                return (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    {isFirstInGroup && (
                      <div className="mb-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs">
                        <p className="font-semibold text-primary">🎁 {item.giftSetLabel}</p>
                        {item.packagingLabel && (
                          <p className="text-muted-foreground">Opakowanie: {item.packagingLabel}</p>
                        )}
                        {item.giftMessage && (
                          <p className="italic text-muted-foreground">„{item.giftMessage}”</p>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-3",
                        item.giftSetGroupId !== "" && "pl-4",
                      )}
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {image && (
                          <Image src={image} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {item.variant ? (
                          <Link
                            href={`/admin/produkty/${item.variant.productId}`}
                            className="font-medium hover:text-primary"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <p className="font-medium">{item.productName}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.variantOpt && `${item.variantOpt} · `}SKU {item.sku}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {formatPrice(item.unitPricePln)} ×{" "}
                        <span
                          className={cn(
                            item.quantity > 1 &&
                              "rounded bg-warning/25 px-1 font-semibold text-foreground",
                          )}
                        >
                          {item.quantity}
                        </span>
                      </p>
                      <p className="w-24 text-right text-sm font-medium tabular-nums">
                        {formatPrice(item.totalPln)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Produkty</dt>
                <dd>{formatPrice(order.subtotalPln)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Dostawa · {shippingLabel(order.shippingMethod)}
                </dt>
                <dd>{formatPrice(order.shippingCostPln)}</dd>
              </div>
              {order.discountPln > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Rabat{order.couponCode && ` (${order.couponCode})`}</dt>
                  <dd>−{formatPrice(order.discountPln)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Razem</dt>
                <dd>{formatPrice(order.totalPln)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Status i notatka">
            <StatusForm
              // Remount when status changes elsewhere (e.g. "mark as paid") — the select is uncontrolled
              key={order.status}
              orderId={order.id}
              shippingMethod={order.shippingMethod}
              currentStatus={order.status}
              currentNote={order.noteAdmin}
              currentTrackingNumber={order.trackingNumber}
            />
          </Panel>

          <Panel title="Historia">
            <ol className="relative space-y-4 pl-6 before:absolute before:top-1.5 before:bottom-1.5 before:left-[7px] before:w-px before:bg-border">
              {timeline.map((e) => {
                const done = e.at != null || e.done;
                return (
                  <li key={e.label} className="relative text-sm">
                    <span
                      className={cn(
                        "absolute top-0.5 -left-6 flex size-[15px] items-center justify-center rounded-full ring-4 ring-card",
                        done
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card",
                      )}
                    >
                      {done && <Check className="size-2.5" strokeWidth={3} aria-hidden />}
                    </span>
                    <p className={cn(!done && "text-muted-foreground")}>{e.label}</p>
                    {e.at && (
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                    )}
                  </li>
                );
              })}
            </ol>
            {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
              <div className="mt-5 border-t border-border pt-4">
                <RequestReviewButton orderId={order.id} requestedAt={order.reviewRequestedAt} />
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <Panel
            title="Klient"
            actions={
              customerOrderCount > 1 && (
                <Link
                  href={`/admin/klienci/${encodeURIComponent(order.customerEmail)}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {customerOrderCount}{" "}
                  {pluralPl(customerOrderCount, "zamówienie", "zamówienia", "zamówień")}
                </Link>
              )
            }
          >
            <Link
              href={`/admin/klienci/${encodeURIComponent(order.customerEmail)}`}
              className="font-medium hover:text-primary"
            >
              {order.customerName}
            </Link>
            <p className="mb-1 text-xs text-muted-foreground">
              {order.customerId ? "Konto klienta" : "Gość"}
            </p>
            <CopyField label="E-mail" value={order.customerEmail} />
            <CopyField label="Telefon" value={order.customerPhone} />
          </Panel>

          <Panel
            title="Dostawa"
            actions={
              !isPickup && (
                <CopyButton value={shippingBlock} label="Kopiuj dane do wysyłki">
                  Kopiuj wszystko
                </CopyButton>
              )
            }
          >
            <p className="mb-2 text-sm font-medium">{shippingLabel(order.shippingMethod)}</p>
            {isPickup ? (
              <p className="text-sm text-muted-foreground">
                {pickup ? `${pickup.name}, ${pickup.address}` : order.pickupLocation}
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                <CopyField
                  label={order.shippingMethod === "ORLEN_PACZKA" ? "Punkt Orlen" : "Paczkomat"}
                  value={order.inpostMachineId}
                />
                {order.inpostMachineName && (
                  <p className="pb-1 text-xs text-muted-foreground">{order.inpostMachineName}</p>
                )}
                <CopyField label="Odbiorca" value={recipient} />
                <CopyField label="Firma" value={order.shipCompany} />
                <CopyField label="Ulica" value={street} />
                <CopyField label="Kod pocztowy" value={order.shipPostalCode} />
                <CopyField label="Miasto" value={order.shipCity} />
                <CopyField label="Telefon odbiorcy" value={phone} />
              </div>
            )}
            {order.trackingNumber && (
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <p className="text-xs text-muted-foreground">Numer przesyłki</p>
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
                  <p className="font-medium">{order.trackingNumber}</p>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Płatność">
            <p className="text-sm">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            {isPaid ? (
              <p className="mt-1 text-sm text-success">
                Opłacone{order.paidAt && ` · ${formatDateTime(order.paidAt)}`}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {order.paymentMethod === "BANK_TRANSFER" && (
                  <p className="text-xs text-muted-foreground">
                    Tytuł przelewu powinien zawierać{" "}
                    <span className="font-medium text-foreground">{order.orderNumber}</span>, kwota{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(order.totalPln)}
                    </span>
                    .
                  </p>
                )}
                <MarkPaidButton orderId={order.id} />
              </div>
            )}
            {order.paymentRef && (
              <p className="mt-2 text-xs text-muted-foreground">
                Transakcja P24: {order.paymentRef}
              </p>
            )}
          </Panel>

          {order.wantsFaktura && (
            <Panel title="Faktura VAT">
              <div className="divide-y divide-border/60">
                <CopyField label="Firma" value={order.billCompany} />
                <CopyField label="NIP" value={order.billNip} />
                <CopyField label="Ulica" value={order.billStreet} />
                <CopyField
                  label="Kod i miasto"
                  value={[order.billPostalCode, order.billCity].filter(Boolean).join(" ")}
                />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
