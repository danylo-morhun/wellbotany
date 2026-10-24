// Shared by the confirmation screen and the acknowledgement e-mail, so both show the same text

const WARSAW_TIME = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
  timeStyle: "medium",
  timeZone: "Europe/Warsaw",
});

/** Date and time of receipt — the acknowledgement must state them (Dyr. 2011/83 art. 11a ust. 3) */
export function formatReceivedAt(date: Date): string {
  return WARSAW_TIME.format(date);
}

/** The statement in the words of the statutory form (UPK zał. 2) */
export function withdrawalStatement({
  name,
  orderNumber,
  items,
}: {
  name: string;
  orderNumber: string;
  items: string;
}): string {
  const what = items.trim() || "wszystkich towarów z zamówienia";
  return `Ja, ${name}, niniejszym informuję o odstąpieniu od umowy sprzedaży następujących towarów: ${what} (zamówienie ${orderNumber}).`;
}
