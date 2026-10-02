import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const HOME_BANNERS_TAG = "home-banners";

const getActiveBannerRows = unstable_cache(
  () =>
    prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ["home-banners"],
  { tags: [HOME_BANNERS_TAG] },
);

export type HomeBannerItem = Awaited<ReturnType<typeof getActiveBannerRows>>[number];

/** Active banners inside their date window. Dates are filtered after the cache:
 * a hit returns them as strings (see unstable-cache-dates), and the window must
 * open/close without an admin edit. */
export async function getHomeBanners(now = new Date()): Promise<HomeBannerItem[]> {
  const rows = await getActiveBannerRows();
  return rows.filter(
    (b) => (!b.startsAt || new Date(b.startsAt) <= now) && (!b.endsAt || new Date(b.endsAt) >= now),
  );
}
