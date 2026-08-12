import { z } from "zod";

export const checkoutSchema = z
  .object({
    cartId: z.string().min(1),
    email: z.string().email("Nieprawidłowy adres e-mail"),
    phone: z.string().min(9, "Min. 9 znaków").max(15),
    firstName: z.string().min(1, "Imię jest wymagane").max(60),
    lastName: z.string().min(1, "Nazwisko jest wymagane").max(60),
    street: z.string().min(1, "Ulica jest wymagana"),
    apartment: z.string().optional(),
    city: z.string().min(1, "Miasto jest wymagane"),
    postalCode: z.string().regex(/^\d{2}-\d{3}$/, "Format: XX-XXX"),
    shippingMethod: z.enum(["INPOST_PACZKOMAT", "INPOST_KURIER", "ORLEN_PACZKA"]),
    inpostMachineId: z.string().optional(),
    inpostMachineName: z.string().optional(),
    wantsFaktura: z.boolean().default(false),
    billCompany: z.string().optional(),
    billNip: z.string().optional(),
    billStreet: z.string().optional(),
    billCity: z.string().optional(),
    billPostalCode: z.string().optional(),
    paymentMethod: z.enum(["BLIK", "PRZELEWY24", "APPLE_PAY", "GOOGLE_PAY"]),
    couponCode: z.string().optional(),
    acceptedTerms: z
      .boolean()
      .refine((v) => v, { message: "Wymagana akceptacja regulaminu i polityki prywatności" }),
  })
  .superRefine((data, ctx) => {
    if (
      (data.shippingMethod === "INPOST_PACZKOMAT" || data.shippingMethod === "ORLEN_PACZKA") &&
      !data.inpostMachineId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj identyfikator punktu odbioru",
        path: ["inpostMachineId"],
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
