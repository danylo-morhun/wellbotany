/**
 * Every category a product is listed in: its primary one plus any extras,
 * deduped. The primary must always be listed — category pages filter by
 * links, so a product missing its own primary link would vanish from it.
 */
export function categoryLinkIds(primaryId: string | null, extraIds: string[]): string[] {
  return [...new Set([...(primaryId ? [primaryId] : []), ...extraIds.filter(Boolean)])];
}
