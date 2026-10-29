import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncAllToMerchant = vi.fn();
vi.mock("@/lib/merchant", () => ({ syncAllToMerchant }));

const { GET } = await import("@/app/api/cron/merchant-sync/route");

const call = (token?: string) =>
  GET(
    new Request("https://wellbotany.pl/api/cron/merchant-sync", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  );

beforeEach(() => {
  syncAllToMerchant.mockReset().mockResolvedValue({ pushed: 1, total: 1 });
  vi.stubEnv("CRON_SECRET", "cron-s3cret");
  vi.stubEnv("REVALIDATE_SECRET", "script-s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/merchant-sync", () => {
  it("runs for the cron and for bulk scripts", async () => {
    expect((await call("cron-s3cret")).status).toBe(200);
    expect((await call("script-s3cret")).status).toBe(200);
    expect(syncAllToMerchant).toHaveBeenCalledTimes(2);
  });

  it("refuses anything else, also when a secret is unset", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("wrong")).status).toBe(401);
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect((await call("")).status).toBe(401);
    expect(syncAllToMerchant).not.toHaveBeenCalled();
  });
});
