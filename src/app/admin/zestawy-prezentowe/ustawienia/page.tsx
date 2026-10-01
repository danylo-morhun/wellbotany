import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { GiftBuilderSettingsForm } from "@/features/gift-sets/components/GiftBuilderSettingsForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Kreator zestawu" };

export default async function AdminGiftBuilderSettingsPage() {
  const settings = await prisma.giftBuilderSettings.findUnique({ where: { id: 1 } });

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/zestawy-prezentowe", label: "Zestawy prezentowe" }}
        title="Kreator własnego zestawu"
      />
      <GiftBuilderSettingsForm settings={settings} />
    </div>
  );
}
