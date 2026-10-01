import {
  Award,
  BookOpen,
  FolderTree,
  Gift,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
} from "lucide-react";

export type NavBadgeKey = "orders" | "reviews" | "lowStock" | "messages";
export type NavBadges = Partial<Record<NavBadgeKey, number>>;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: NavBadgeKey;
  /** Two-key shortcut: "g" then this key */
  shortcut?: string;
};

export type NavGroup = { label: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Pulpit", icon: LayoutDashboard, shortcut: "h" }],
  },
  {
    label: "Sprzedaż",
    items: [
      {
        href: "/admin/zamowienia",
        label: "Zamówienia",
        icon: ShoppingBag,
        badge: "orders",
        shortcut: "o",
      },
      { href: "/admin/klienci", label: "Klienci", icon: Users, shortcut: "c" },
      { href: "/admin/kupony", label: "Kupony", icon: TicketPercent },
      { href: "/admin/opinie", label: "Opinie", icon: Star, badge: "reviews", shortcut: "r" },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/admin/produkty", label: "Produkty", icon: Package, shortcut: "p" },
      { href: "/admin/magazyn", label: "Magazyn", icon: Warehouse, badge: "lowStock" },
      { href: "/admin/zestawy-prezentowe", label: "Zestawy prezentowe", icon: Gift },
      { href: "/admin/kategorie", label: "Kategorie", icon: FolderTree },
      { href: "/admin/marki", label: "Marki", icon: Award },
      { href: "/admin/tagi", label: "Tagi", icon: Tags },
    ],
  },
  {
    label: "Treści",
    items: [
      { href: "/admin/poradnik", label: "Poradnik", icon: BookOpen },
      {
        href: "/admin/wiadomosci",
        label: "Wiadomości",
        icon: Mail,
        badge: "messages",
        shortcut: "m",
      },
    ],
  },
  {
    label: null,
    items: [{ href: "/admin/ustawienia", label: "Ustawienia", icon: Settings }],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
