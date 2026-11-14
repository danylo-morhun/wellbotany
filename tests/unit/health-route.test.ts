import { mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const get = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { shopSettings: { findFirst } } }));
vi.mock("@/lib/redis", () => ({ redis: { get } }));

const { GET } = await import("@/app/api/health/route");

async function backupDir(ageHours: { backup: number; offsite: number }) {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-health-"));
  for (const [name, hours] of [
    [".backup-ok", ageHours.backup],
    [".offsite-ok", ageHours.offsite],
  ] as const) {
    const file = path.join(dir, name);
    await writeFile(file, "");
    const t = new Date(Date.now() - hours * 3_600_000);
    await utimes(file, t, t);
  }
  return dir;
}

afterEach(() => {
  delete process.env.BACKUP_DIR;
});

describe("GET /api/health", () => {
  it("is 200 when everything answers and backups are fresh", async () => {
    findFirst.mockResolvedValue({ id: 1 });
    get.mockResolvedValue(null);
    process.env.BACKUP_DIR = await backupDir({ backup: 13, offsite: 13 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      checks: { db: true, redis: true, backup: true, offsite: true },
    });
  });

  it("is 503 naming what failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findFirst.mockRejectedValue(new Error("db down"));
    get.mockResolvedValue(null);
    process.env.BACKUP_DIR = await backupDir({ backup: 13, offsite: 30 });
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).checks).toEqual({
      db: false,
      redis: true,
      backup: true,
      offsite: false,
    });
  });

  it("fails backups when the markers are missing", async () => {
    findFirst.mockResolvedValue({ id: 1 });
    get.mockResolvedValue(null);
    process.env.BACKUP_DIR = await mkdtemp(path.join(tmpdir(), "wb-health-"));
    expect((await (await GET()).json()).checks).toMatchObject({ backup: false, offsite: false });
  });
});
