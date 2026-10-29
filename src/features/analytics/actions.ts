"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { expenseIdSchema, expenseSchema } from "./schema";

export const addExpense = adminActionClient
  .schema(expenseSchema)
  .action(async ({ parsedInput: { date, note, ...data } }) => {
    await prisma.expense.create({
      data: { ...data, date: new Date(`${date}T00:00:00Z`), note: note || null },
    });
    revalidatePath("/admin/wyniki");
    return { success: true };
  });

export const deleteExpense = adminActionClient
  .schema(expenseIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/admin/wyniki");
    return { success: true };
  });
