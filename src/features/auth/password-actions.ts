"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, loginLimiter } from "@/lib/rate-limit";
import { adminActionClient } from "@/lib/safe-action";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Podaj obecne hasło"),
    newPassword: z.string().min(12, "Nowe hasło musi mieć co najmniej 12 znaków").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Nowe hasło musi być inne niż obecne",
    path: ["newPassword"],
  });

/** Signed-in admin changes their own password; the current one is checked first. */
export const changeAdminPassword = adminActionClient
  .schema(changePasswordSchema)
  .action(async ({ parsedInput: input, ctx: { adminId } }) => {
    await assertNotRateLimited(loginLimiter, `password-change:${adminId}`);
    const customer = await prisma.customer.findUnique({
      where: { id: adminId },
      select: { passwordHash: true },
    });
    if (!customer?.passwordHash) throw new ActionError("Brak konta");
    const valid = await bcrypt.compare(input.currentPassword, customer.passwordHash);
    if (!valid) throw new ActionError("Obecne hasło jest nieprawidłowe");
    await prisma.customer.update({
      where: { id: adminId },
      data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
    });
    return { success: true };
  });
