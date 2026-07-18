import Link from "next/link";
import { GiftBuilderSettingsForm } from "@/features/gift-sets/components/GiftBuilderSettingsForm";
import { prisma } from "@/lib/prisma";

export default async function AdminGiftBuilderSettingsPage() {
  const settings = await prisma.giftBuilderSettings.findUnique({ where: { id: 1 } });

  return (
    <div className="space-y-4">
      <Link href="/admin/naborys" className="text-sm font-medium text-primary hover:underline">
        ← Zestawy prezentowe
      </Link>
      <h1 className="text-2xl font-bold">Kreator własnego zestawu</h1>
      <GiftBuilderSettingsForm settings={settings} />
    </div>
  );
}
