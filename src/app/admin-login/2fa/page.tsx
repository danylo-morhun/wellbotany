import { redirect } from "next/navigation";
import { TotpSetup } from "@/features/auth/components/TotpSetup";
import { ADMIN_LOGIN_PATH } from "@/features/auth/lib/admin-login-path";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Weryfikacja dwuetapowa",
  robots: { index: false, follow: false },
};

export default async function AdminTotpSetupPage() {
  const session = await auth();
  if (!session?.user) redirect(`${ADMIN_LOGIN_PATH}?callbackUrl=${ADMIN_LOGIN_PATH}/2fa`);
  if (!session.user.totpSetup) redirect("/admin");

  return (
    <>
      <h1 className="mb-3 text-xl">Włącz weryfikację dwuetapową</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Panel wymaga kodu z aplikacji w telefonie (Google Authenticator, Authy, 1Password lub
        podobnej). Bez tego konto nie ma uprawnień administratora.
      </p>
      <TotpSetup />
    </>
  );
}
