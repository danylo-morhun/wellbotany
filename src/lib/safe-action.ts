import { Prisma } from "@prisma/client";
import { createSafeActionClient } from "next-safe-action";
import { ActionError } from "./action-error";
import { auth } from "./auth";

/** PL label for a unique/FK field, used in Prisma error messages. Falls back to the raw name. */
const FIELD_LABELS: Record<string, string> = {
  slug: "adres URL (slug)",
  sku: "SKU",
  ean: "kod EAN",
  email: "adres e-mail",
  code: "kod",
  orderNumber: "numer zamówienia",
};

function fieldLabel(field: string | undefined) {
  if (!field) return "ta wartość";
  return FIELD_LABELS[field] ?? field;
}

function prismaErrorMessage(e: Prisma.PrismaClientKnownRequestError): string | null {
  switch (e.code) {
    case "P2002": {
      const target = e.meta?.target;
      const field = Array.isArray(target) ? (target[0] as string) : undefined;
      return `Rekord z tą wartością (${fieldLabel(field)}) już istnieje`;
    }
    case "P2025":
      return "Nie znaleziono rekordu — mógł zostać już usunięty";
    case "P2003":
      return "Nie można wykonać operacji — istnieją powiązane rekordy";
    default:
      return null;
  }
}

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    // Only intentional, user-facing messages pass through; everything else
    // (Prisma, network, bugs) stays masked — except known Prisma constraint
    // errors, which get a specific PL message instead of the generic one.
    if (e instanceof ActionError) return e.message;
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const message = prismaErrorMessage(e);
      if (message) return message;
    }
    return "Coś poszło nie tak. Spróbuj ponownie.";
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ActionError("Nie jesteś zalogowany");
  }
  return next({ ctx: { customerId: session.user.id } });
});

export const adminActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new ActionError("Brak uprawnień");
  }
  return next({ ctx: { adminId: session.user.id } });
});
