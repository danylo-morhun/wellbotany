import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/app/admin/components/ui";
import { buttonVariants } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="rounded-2xl bg-card shadow-card">
      <EmptyState icon={SearchX} title="Nie znaleziono">
        <p>Ten rekord nie istnieje albo został usunięty.</p>
        <Link
          href="/admin"
          className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-4`}
        >
          Wróć do pulpitu
        </Link>
      </EmptyState>
    </div>
  );
}
