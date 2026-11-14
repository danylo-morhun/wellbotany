import Image from "next/image";

// Login on admin.wellbotany.pl (/logowanie there redirects here): no shop
// header, footer, banners or analytics — just the form.
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image
          src="/branding/logo-horizontal.svg"
          alt="Well Botany"
          width={177}
          height={31}
          priority
          className="h-7 w-auto dark:hidden"
        />
        <Image
          src="/branding/logo-horizontal-white.svg"
          alt="Well Botany"
          width={177}
          height={31}
          priority
          className="hidden h-7 w-auto dark:block"
        />
        <p className="text-sm text-muted-foreground">Panel administracyjny</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card sm:p-8">{children}</div>
    </main>
  );
}
