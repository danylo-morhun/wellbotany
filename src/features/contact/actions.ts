"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionClient, adminActionClient } from "@/lib/safe-action";
import { contactMessageSchema, setMessageReadSchema } from "./schema";

export const sendContactMessage = actionClient
  .schema(contactMessageSchema)
  .action(async ({ parsedInput }) => {
    await prisma.contactMessage.create({ data: parsedInput });
    return { success: true };
  });

export const setMessageRead = adminActionClient
  .schema(setMessageReadSchema)
  .action(async ({ parsedInput: { id, isRead } }) => {
    await prisma.contactMessage.update({ where: { id }, data: { isRead } });
    revalidatePath("/admin", "layout");
    return { success: true };
  });
