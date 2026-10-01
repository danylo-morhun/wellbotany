import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Podaj imię i nazwisko").max(120),
  email: z.string().email("Podaj poprawny adres e-mail"),
  subject: z.string().min(3, "Podaj temat wiadomości").max(200),
  message: z.string().min(10, "Wiadomość jest zbyt krótka").max(5000),
});

export const setMessageReadSchema = z.object({ id: z.string().min(1), isRead: z.boolean() });
