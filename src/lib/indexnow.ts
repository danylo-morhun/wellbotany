// IndexNow: tells Bing (and Yandex, Seznam…) that a page changed, so it
// recrawls within minutes instead of days. Google doesn't use it. The key is
// public by design: public/<key>.txt proves we own the host. Production only.
const KEY = "3578755a4ad981887117ae1539efbb41";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

export async function pingIndexNow(paths: string[]): Promise<void> {
  if (process.env.VERCEL_ENV !== "production" || paths.length === 0) return;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList: paths.map((path) => `${SITE_URL}${path}`),
    }),
  });
  if (!res.ok) console.error(`IndexNow ping failed: ${res.status}`);
}
