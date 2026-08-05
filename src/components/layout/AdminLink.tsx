import Link from "next/link";
import { auth } from "@/lib/auth";

export async function AdminLink() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  return (
    <Link
      href="/admin/zamowienia"
      className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
    >
      Admin
    </Link>
  );
}
