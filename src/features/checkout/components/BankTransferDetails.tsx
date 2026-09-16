import { formatPrice } from "@/lib/format";
import { BANK_TRANSFER_DETAILS } from "@/lib/shop-config";

type Props = { orderNumber: string; totalPln: number };

export function BankTransferDetails({ orderNumber, totalPln }: Props) {
  return (
    <div className="space-y-3 rounded-2xl bg-card p-6 shadow-card">
      <h2 className="font-semibold">Dane do przelewu</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Odbiorca</dt>
        <dd className="font-medium">{BANK_TRANSFER_DETAILS.recipient}</dd>
        <dt className="text-muted-foreground">Numer rachunku</dt>
        <dd className="font-medium tabular-nums">{BANK_TRANSFER_DETAILS.account}</dd>
        <dt className="text-muted-foreground">Kwota</dt>
        <dd className="font-medium">{formatPrice(totalPln)}</dd>
        <dt className="text-muted-foreground">Tytuł przelewu</dt>
        <dd className="font-medium">{orderNumber}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">
        Zamówienie zrealizujemy po zaksięgowaniu wpłaty.
      </p>
    </div>
  );
}
