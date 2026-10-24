import { z } from "zod";

export const withdrawalSchema = z.object({
  name: z.string().trim().min(3, "Podaj imię i nazwisko").max(120),
  email: z.string().trim().email("Podaj adres e-mail użyty w zamówieniu"),
  orderNumber: z.string().trim().min(3, "Podaj numer zamówienia").max(40),
  // Empty = the whole order
  items: z.string().trim().max(2000).default(""),
});

export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
