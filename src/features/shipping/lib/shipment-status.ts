// Polish names for epaka parcel states, shown in the admin and the shop alert e-mail
export const NOT_HANDED_OVER = "not_handed_over";

export const PACKAGE_STATUS_LABELS: Record<string, string> = {
  package_no_send: "Czeka na nadanie",
  package_received_from_sender: "Odebrana przez przewoźnika",
  package_on_transit: "W drodze",
  package_in_delivery: "W doręczeniu",
  package_delivered: "Doręczona",
  package_delivery_problem: "Problem z doręczeniem",
  package_damaged: "Uszkodzona",
  wrong_address: "Błędny adres",
  return_to_sender: "Zwrot do nadawcy",
  package_sending_in_point: "Nadana w punkcie",
  package_waiting_in_point: "Czeka w punkcie odbioru",
  package_sending_in_paczkomat: "Nadana w paczkomacie",
  package_waiting_in_paczkomat: "Czeka w paczkomacie",
  [NOT_HANDED_OVER]: "Paczka nie została nadana",
};

/** End of the next working day after the label (Sat/Sun skipped), Warsaw time is close enough in UTC+1/2 */
export function handOverDeadline(labelCreatedAt: Date): Date {
  const d = new Date(labelCreatedAt);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(17, 0, 0, 0); // 18:00/19:00 in Warsaw
  return d;
}
