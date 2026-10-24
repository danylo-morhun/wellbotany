import { describe, expect, it } from "vitest";
import { buildPurchaseEvent } from "@/features/ads/lib/meta-capi";
import { sha256 } from "@/features/ads/lib/user-data";

const order = {
  orderNumber: "TZ-2026-00042",
  totalPln: 12990,
  numItems: 3,
  email: "Anna@wp.pl",
  phone: "600100200",
  fbc: "fb.1.1700000000000.abc",
  clientIp: "203.0.113.5",
  userAgent: "Mozilla/5.0",
  appUrl: "https://wellbotany.pl",
};

describe("buildPurchaseEvent", () => {
  const event = buildPurchaseEvent(order, new Date("2026-10-24T10:00:00Z"));

  it("carries value, hashed contact and the order number as event_id", () => {
    expect(event).toMatchObject({
      event_name: "Purchase",
      event_id: "TZ-2026-00042",
      event_time: 1792836000,
      action_source: "website",
      custom_data: { currency: "PLN", value: 129.9, num_items: 3 },
      user_data: {
        em: [sha256("anna@wp.pl")],
        ph: [sha256("48600100200")],
        fbc: "fb.1.1700000000000.abc",
        client_ip_address: "203.0.113.5",
        client_user_agent: "Mozilla/5.0",
      },
    });
  });

  it("sends no product data and no page path (health information)", () => {
    expect(event.event_source_url).toBe("https://wellbotany.pl/");
    expect(event.custom_data).not.toHaveProperty("content_ids");
    expect(event.custom_data).not.toHaveProperty("contents");
    expect(event.custom_data).not.toHaveProperty("content_name");
    expect(event.custom_data).not.toHaveProperty("content_category");
  });

  it("omits an unknown IP", () => {
    expect(buildPurchaseEvent({ ...order, clientIp: "unknown" }).user_data).not.toHaveProperty(
      "client_ip_address",
    );
  });
});
