import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Guarded routes: pretend nobody is signed in
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (req: NextRequest) =>
    handler(Object.assign(req, { auth: null })),
}));

let proxy: (req: NextRequest, event: never) => Response | Promise<Response>;
beforeAll(async () => {
  process.env.ADMIN_HOST = "admin.wellbotany.pl";
  proxy = (await import("@/proxy")).default as never;
});

async function get(host: string, path: string) {
  const req = new NextRequest(`https://${host}${path}`, { headers: { host } });
  const res = await proxy(req, {} as never);
  return { status: res.status, location: res.headers.get("location") };
}

describe("admin host routing", () => {
  it("sends /logowanie on the admin host to its own login page", async () => {
    expect(await get("admin.wellbotany.pl", "/logowanie?callbackUrl=%2Fadmin")).toEqual({
      status: 307,
      location: "https://admin.wellbotany.pl/admin-login?callbackUrl=%2Fadmin",
    });
    expect((await get("admin.wellbotany.pl", "/logowanie/2fa")).location).toBe(
      "https://admin.wellbotany.pl/admin-login/2fa",
    );
  });

  it("guards /admin with the admin login, not the shop one", async () => {
    const { status, location } = await get("admin.wellbotany.pl", "/admin/zamowienia");
    expect(status).toBe(307);
    expect(location).toContain("https://admin.wellbotany.pl/admin-login?callbackUrl=");
  });

  it("serves the admin login itself and moves admin paths off the shop host", async () => {
    expect((await get("admin.wellbotany.pl", "/admin-login")).status).toBe(200);
    expect(await get("wellbotany.pl", "/admin-login")).toEqual({
      status: 308,
      location: "https://admin.wellbotany.pl/admin-login",
    });
    expect((await get("wellbotany.pl", "/admin")).location).toBe(
      "https://admin.wellbotany.pl/admin",
    );
    expect((await get("wellbotany.pl", "/logowanie")).status).toBe(200);
  });
});
