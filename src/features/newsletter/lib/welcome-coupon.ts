import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { WELCOME_COUPON_VALID_DAYS, WELCOME_DISCOUNT_PERCENT } from "./constants";

// No 0/O/1/I/L — the code is retyped from an e-mail
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function welcomeCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `WITAJ-${suffix}`;
}

/** Single-use personal code — one per subscriber, so a leaked code is worth one order. */
export async function createWelcomeCoupon(tx: Prisma.TransactionClient) {
  const validUntil = new Date(Date.now() + WELCOME_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  return tx.coupon.create({
    data: {
      code: welcomeCode(),
      type: "PERCENTAGE",
      value: WELCOME_DISCOUNT_PERCENT,
      maxUsages: 1,
      validUntil,
    },
    select: { id: true, code: true, validUntil: true },
  });
}
