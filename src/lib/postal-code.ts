/** Formats typed digits as a Polish postal code: "00950" -> "00-950". */
export function formatPostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}
