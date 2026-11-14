import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata = {
  title: "Logowanie",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; "2fa"?: string }>;
}) {
  const { callbackUrl, "2fa": twoFactor } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
        <h1 className="mb-8 text-balance text-2xl">Zaloguj się</h1>
        {twoFactor === "wlaczona" && (
          <p className="mb-6 rounded-lg bg-primary/10 px-4 py-3 text-sm">
            Weryfikacja dwuetapowa włączona. Zaloguj się ponownie — po haśle podasz kod z aplikacji.
          </p>
        )}
        <LoginForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="font-medium text-primary hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}
