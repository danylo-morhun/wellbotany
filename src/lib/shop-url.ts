/**
 * Storefront link from the admin. The admin runs on its own host in prod
 * (admin.wellbotany.pl), where "/" means the admin itself — so name the shop's
 * origin. Unset (dev) = same host, relative path.
 */
export function shopUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${path}`;
}
