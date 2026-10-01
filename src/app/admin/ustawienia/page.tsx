import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { ShopSettingsForm } from "@/features/settings/components/ShopSettingsForm";
import { getShopSettings } from "@/features/settings/lib/shop-settings";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();

  return (
    <div>
      <PageHeader title="Ustawienia sklepu" />
      <ShopSettingsForm settings={settings} />
    </div>
  );
}
