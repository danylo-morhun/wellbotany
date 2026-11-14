import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extraDueDay,
  extraTimeJustEnded,
  paymentDueDay,
  reminderDue,
} from "@/features/orders/lib/payment-reminders";
import { addBusinessDays, warsawDay } from "@/lib/business-days";

describe("business days", () => {
  it("skips weekends and Polish holidays", () => {
    expect(addBusinessDays("2026-11-13", 3)).toBe("2026-11-18"); // Fri → Wed
    expect(addBusinessDays("2026-11-09", 3)).toBe("2026-11-13"); // 11.11 is a holiday
    expect(addBusinessDays("2026-12-23", 1)).toBe("2026-12-28"); // 24–27.12 off
  });
  it("uses the Warsaw calendar day", () => {
    expect(warsawDay(new Date("2026-11-13T23:30:00Z"))).toBe("2026-11-14");
  });
});

describe("payment reminder timing", () => {
  const placed = new Date("2026-11-13T15:00:00+01:00"); // Friday
  it("is due the day after the 3rd working day", () => {
    expect(paymentDueDay(placed)).toBe("2026-11-18");
    expect(reminderDue({ createdAt: placed }, new Date("2026-11-18T20:00:00+01:00"))).toBe(false);
    expect(reminderDue({ createdAt: placed }, new Date("2026-11-19T10:00:00+01:00"))).toBe(true);
  });
  it("gives 7 extra days and flags the shop once, the day after", () => {
    const sent = new Date("2026-11-19T10:00:00+01:00");
    expect(extraDueDay(sent)).toBe("2026-11-26");
    expect(
      extraTimeJustEnded({ paymentReminderSentAt: sent }, new Date("2026-11-26T10:00:00+01:00")),
    ).toBe(false);
    expect(
      extraTimeJustEnded({ paymentReminderSentAt: sent }, new Date("2026-11-27T10:00:00+01:00")),
    ).toBe(true);
    expect(
      extraTimeJustEnded({ paymentReminderSentAt: sent }, new Date("2026-11-28T10:00:00+01:00")),
    ).toBe(false);
  });
});

describe("GET /api/cron/payment-reminders", async () => {
  process.env.CRON_SECRET = "cron-test";
  const findMany = vi.fn();
  const updateMany = vi.fn();
  const update = vi.fn();
  const sendReminder = vi.fn();
  const sendSummary = vi.fn();
  vi.doMock("@/lib/prisma", () => ({ prisma: { order: { findMany, updateMany, update } } }));
  vi.doMock("@/lib/email/payment-reminder-emails", () => ({
    sendPaymentReminderEmail: sendReminder,
    sendPaymentReminderSummary: sendSummary,
  }));
  const { GET } = await import("@/app/api/cron/payment-reminders/route");
  const call = (auth = "Bearer cron-test") =>
    GET(
      new Request("http://localhost/api/cron/payment-reminders", {
        headers: { authorization: auth },
      }),
    );

  const order = (n: string, createdAt: string, paymentReminderSentAt: Date | null = null) => ({
    id: n,
    orderNumber: n,
    customerEmail: `${n}@example.test`,
    customerName: "Jan",
    totalPln: 4990,
    paymentMethod: "BANK_TRANSFER",
    createdAt: new Date(createdAt),
    paymentReminderSentAt,
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-27T10:00:00+01:00"), toFake: ["Date"] });
    findMany.mockReset();
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    update.mockReset().mockResolvedValue({});
    sendReminder.mockReset().mockResolvedValue(true);
    sendSummary.mockReset().mockResolvedValue(undefined);
  });

  it("needs the cron secret", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
  });

  it("reminds overdue orders once and reports expired extra time", async () => {
    findMany.mockResolvedValue([
      order("TZ-1", "2026-11-20T12:00:00+01:00"), // due 25.11 → remind
      order("TZ-2", "2026-11-25T12:00:00+01:00"), // due 30.11 → wait
      order("TZ-3", "2026-11-13T12:00:00+01:00", new Date("2026-11-19T10:00:00+01:00")), // extra ended 26.11
    ]);
    const res = await call();
    expect(await res.json()).toEqual({
      ok: true,
      reminded: ["TZ-1"],
      expired: ["TZ-3"],
      failed: [],
    });
    expect(sendReminder).toHaveBeenCalledTimes(1);
    expect(sendSummary).toHaveBeenCalledWith(
      [expect.objectContaining({ orderNumber: "TZ-1", due: "2026-12-04" })],
      [expect.objectContaining({ orderNumber: "TZ-3" })],
    );
  });

  it("releases the claim when the e-mail can't be sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockResolvedValue([order("TZ-1", "2026-11-20T12:00:00+01:00")]);
    sendReminder.mockRejectedValue(new Error("resend down"));
    const body = await (await call()).json();
    expect(body.failed).toEqual(["TZ-1"]);
    expect(update).toHaveBeenCalledWith({
      where: { id: "TZ-1" },
      data: { paymentReminderSentAt: null },
    });
  });
});
