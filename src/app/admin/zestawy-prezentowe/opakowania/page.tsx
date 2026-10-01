import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GiftPackagingAdmin } from "@/features/gift-sets/components/GiftPackagingAdmin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Opakowania" };

export default async function AdminGiftPackagingPage() {
  const packagings = await prisma.giftPackaging.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <Link
        href="/admin/zestawy-prezentowe"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Zestawy prezentowe
      </Link>
      <GiftPackagingAdmin packagings={packagings} />
    </div>
  );
}
