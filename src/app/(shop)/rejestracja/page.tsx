import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata = {
  title: "Rejestracja — Twoje Zdrowie",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
        <h1 className="mb-8 text-balance text-2xl">Utwórz konto</h1>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Link href="/logowanie" className="font-medium text-primary hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
