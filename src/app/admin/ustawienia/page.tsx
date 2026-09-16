import { ShopSettingsForm } from "@/features/settings/components/ShopSettingsForm";
import { getShopSettings } from "@/features/settings/lib/shop-settings";

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ustawienia sklepu</h1>
      <ShopSettingsForm settings={settings} />
    </div>
  );
}
