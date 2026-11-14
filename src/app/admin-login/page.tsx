import { Button } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { ADMIN_LOGIN_PATH } from "@/features/auth/lib/admin-login-path";
import { auth, signOut } from "@/lib/auth";

export const metadata = {
  title: "Logowanie do panelu",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; "2fa"?: string }>;
}) {
  const { callbackUrl, "2fa": twoFactor } = await searchParams;
  const session = await auth();

  // Signed in without admin rights: the guard would just send them back here
  if (session?.user && session.user.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl">Brak dostępu</h1>
        <p className="text-sm text-muted-foreground">
          Konto {session.user.email} nie ma uprawnień do panelu. Wyloguj się i zaloguj kontem
          administratora.
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: ADMIN_LOGIN_PATH });
          }}
        >
          <Button type="submit" variant="outline" className="w-full">
            Wyloguj się
          </Button>
        </form>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-xl">Zaloguj się</h1>
      {twoFactor === "wlaczona" && (
        <p className="mb-6 rounded-lg bg-primary/10 px-4 py-3 text-sm">
          Weryfikacja dwuetapowa włączona. Zaloguj się ponownie — po haśle podasz kod z aplikacji.
        </p>
      )}
      <LoginForm callbackUrl={callbackUrl ?? "/admin"} />
    </>
  );
}
