import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
  /** Admin TOTP code — asked for only after the password checks out */
  code: z
    .string()
    .regex(/^\d{3} ?\d{3}$/, "Kod ma 6 cyfr")
    .optional(),
  callbackUrl: z.string().optional(),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "Imię jest wymagane").max(60),
    lastName: z.string().min(1, "Nazwisko jest wymagane").max(60),
    email: z.string().email("Nieprawidłowy adres e-mail"),
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((v) => v, { message: "Wymagana akceptacja regulaminu" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
