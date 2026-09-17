import { z } from "zod";
import { PICKUP_LOCATION_KEYS } from "@/lib/pickup-locations";
import { requiresAddress, requiresPickupPoint } from "./lib/shipping";

export const checkoutSchema = z
  .object({
    cartId: z.string().min(1),
    email: z.string().email("Nieprawidłowy adres e-mail"),
    phone: z.string().min(9, "Min. 9 znaków").max(15),
    firstName: z.string().min(1, "Imię jest wymagane").max(60),
    lastName: z.string().min(1, "Nazwisko jest wymagane").max(60),
    street: z.string().optional(),
    apartment: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    shippingMethod: z.enum(["INPOST_PACZKOMAT", "INPOST_KURIER", "ORLEN_PACZKA", "PICKUP"]),
    inpostMachineId: z.string().optional(),
    inpostMachineName: z.string().optional(),
    pickupLocation: z.enum(PICKUP_LOCATION_KEYS).optional(),
    wantsFaktura: z.boolean().default(false),
    billCompany: z.string().optional(),
    billNip: z.string().optional(),
    billStreet: z.string().optional(),
    billCity: z.string().optional(),
    billPostalCode: z.string().optional(),
    paymentMethod: z.enum([
      "BLIK",
      "PRZELEWY24",
      "APPLE_PAY",
      "GOOGLE_PAY",
      "BANK_TRANSFER",
      "CASH_ON_DELIVERY",
    ]),
    couponCode: z.string().optional(),
    acceptedTerms: z
      .boolean()
      .refine((v) => v, { message: "Wymagana akceptacja regulaminu i polityki prywatności" }),
  })
  .superRefine((data, ctx) => {
    if (requiresPickupPoint(data.shippingMethod) && !data.inpostMachineId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj identyfikator punktu odbioru",
        path: ["inpostMachineId"],
      });
    }
    if (requiresAddress(data.shippingMethod)) {
      if (!data.street?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ulica jest wymagana",
          path: ["street"],
        });
      if (!data.city?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Miasto jest wymagane",
          path: ["city"],
        });
      if (!/^\d{2}-\d{3}$/.test(data.postalCode ?? ""))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Format: XX-XXX",
          path: ["postalCode"],
        });
    }
    if (data.shippingMethod === "PICKUP" && !data.pickupLocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wybierz punkt odbioru",
        path: ["pickupLocation"],
      });
    }
    if (data.paymentMethod === "CASH_ON_DELIVERY" && data.shippingMethod !== "PICKUP") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Płatność przy odbiorze jest dostępna tylko przy odbiorze osobistym",
        path: ["paymentMethod"],
      });
    }
    if (data.wantsFaktura) {
      if (!data.billCompany?.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Wymagane", path: ["billCompany"] });
      if (!data.billNip?.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Wymagane", path: ["billNip"] });
      else if (!/^\d{10}$/.test(data.billNip))
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "NIP: 10 cyfr", path: ["billNip"] });
      if (!data.billStreet?.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Wymagane", path: ["billStreet"] });
      if (!data.billCity?.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Wymagane", path: ["billCity"] });
      if (!data.billPostalCode?.trim())
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wymagane",
          path: ["billPostalCode"],
        });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
