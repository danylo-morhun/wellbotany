import { createHash } from "node:crypto";

// Customer data for ad platforms is only ever sent normalized + SHA-256 hashed
// (Google enhanced conversions, Meta Conversions API customer parameters).

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Lowercase, trimmed; Gmail ignores dots in the local part, so Google asks to drop them. */
export function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  const [local, domain] = value.split("@");
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return value;
}

/** E.164 digits without "+" (Polish numbers get 48); null when it can't be a phone number. */
export function normalizePhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `48${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Hashes in the shape both Google (sha256_*) and Meta (em/ph) expect. */
export function hashedContact(email: string, phone: string | null | undefined) {
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  return {
    email: sha256(normalizeEmail(email)),
    // Google wants E.164 with "+", Meta digits only
    phoneGoogle: normalizedPhone ? sha256(`+${normalizedPhone}`) : null,
    phoneMeta: normalizedPhone ? sha256(normalizedPhone) : null,
  };
}
