import { redirect } from "next/navigation";
import { TotpSetup } from "@/features/auth/components/TotpSetup";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Weryfikacja dwuetapowa",
  robots: { index: false, follow: false },
};

export default async function TotpSetupPage() {
  const session = await auth();
  if (!session?.user) redirect("/logowanie?callbackUrl=/logowanie/2fa");
  if (!session.user.totpSetup) redirect(session.user.role === "ADMIN" ? "/admin" : "/konto/profil");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
        <h1 className="mb-3 text-balance text-2xl">Włącz weryfikację dwuetapową</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Panel admina wymaga kodu z aplikacji w telefonie (Google Authenticator, Authy, 1Password
          lub podobnej). Bez tego konto nie ma uprawnień administratora.
        </p>
        <TotpSetup />
      </div>
    </div>
  );
}
