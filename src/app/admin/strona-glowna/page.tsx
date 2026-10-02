import type { Metadata } from "next";
import { HomeBannersAdmin } from "@/features/home/components/HomeBannersAdmin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Strona główna" };

export default async function AdminHomePage() {
  const banners = await prisma.homeBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return <HomeBannersAdmin banners={banners} />;
}
