import { redirect } from "next/navigation";
import { AddressesClient } from "@/features/account/components/AddressesClient";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Adresy — Well Botany" };

export default async function AdresyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logowanie");

  const addresses = await prisma.address.findMany({
    where: { customerId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      street: true,
      apartment: true,
      city: true,
      postalCode: true,
      phone: true,
      isDefault: true,
    },
  });

  return <AddressesClient addresses={addresses} />;
}
