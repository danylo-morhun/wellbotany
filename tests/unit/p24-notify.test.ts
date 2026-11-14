import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.P24_CRC = "testcrc";
const findUnique = vi.fn();
const update = vi.fn();
const verifyTransaction = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique, update } } }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/features/stock-sync/lib/levels-cache", () => ({ noteOrdersChanged: vi.fn() }));
vi.mock("@/features/przelewy24/lib/client", async (orig) => ({
  ...(await orig<typeof import("@/features/przelewy24/lib/client")>()),
  CRC: "testcrc",
  verifyTransaction,
}));

const { p24Sign } = await import("@/features/przelewy24/lib/sign");
const { POST } = await import("@/app/api/p24/notify/route");

function notify(sessionId: string, amount = 4990) {
  const fields = {
    merchantId: 407292,
    posId: 407292,
    sessionId,
    amount,
    originAmount: amount,
    currency: "PLN",
    orderId: 123456,
    methodId: 154,
    statement: "p24-A1",
  };
  const sign = p24Sign({ ...fields, crc: "testcrc" });
  return POST(
    new Request("https://wellbotany.pl/api/p24/notify", {
      method: "POST",
      body: JSON.stringify({ ...fields, sign }),
    }) as never,
  );
}

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue({ id: "o1", totalPln: 4990, paymentStatus: "PENDING" });
  update.mockReset();
  verifyTransaction.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/p24/notify", () => {
  it("finds the order from a retry session id and verifies with that id", async () => {
    const res = await notify("TZ-2026-00012-pmhz1abc");
    expect(res.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderNumber: "TZ-2026-00012" } }),
    );
    expect(verifyTransaction).toHaveBeenCalledWith({
      sessionId: "TZ-2026-00012-pmhz1abc",
      orderId: 123456,
      amount: 4990,
    });
    expect(update).toHaveBeenCalled();
  });

  it("leaves a second payment unverified once the order is paid", async () => {
    findUnique.mockResolvedValue({ id: "o1", totalPln: 4990, paymentStatus: "CAPTURED" });
    expect((await notify("TZ-2026-00012-pmhz9xyz")).status).toBe(200);
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("rejects a bad signature", async () => {
    const res = await POST(
      new Request("https://wellbotany.pl/api/p24/notify", {
        method: "POST",
        body: JSON.stringify({ sessionId: "TZ-2026-00012", sign: "x" }),
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});
