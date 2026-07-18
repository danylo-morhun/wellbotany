import Link from "next/link";
import { GiftPackagingAdmin } from "@/features/gift-sets/components/GiftPackagingAdmin";
import { prisma } from "@/lib/prisma";

export default async function AdminGiftPackagingPage() {
  const packagings = await prisma.giftPackaging.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <Link
        href="/admin/zestawy-prezentowe"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Zestawy prezentowe
      </Link>
      <GiftPackagingAdmin packagings={packagings} />
    </div>
  );
}
