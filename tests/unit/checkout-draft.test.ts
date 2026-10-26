import { describe, expect, it } from "vitest";
import { parseDraft } from "@/features/checkout/lib/draft";

const defaults = { email: "", wantsFaktura: false, acceptedTerms: false };
const stored = (draft: unknown) => JSON.stringify(draft);

describe("parseDraft", () => {
  it("restores step and known fields for the same cart", () => {
    const raw = stored({ cartId: "c1", step: 2, data: { email: "a@b.pl", wantsFaktura: true } });
    expect(parseDraft(raw, "c1", defaults)).toEqual({
      step: 2,
      data: { email: "a@b.pl", wantsFaktura: true },
    });
  });

  it("ignores a draft from another cart, or a malformed one", () => {
    expect(parseDraft(stored({ cartId: "c1", step: 2, data: {} }), "c2", defaults)).toBeNull();
    expect(parseDraft("{not json", "c1", defaults)).toBeNull();
    expect(parseDraft(null, "c1", defaults)).toBeNull();
  });

  it("drops unknown or mistyped fields and never restores terms acceptance", () => {
    const raw = stored({
      cartId: "c1",
      step: 3,
      data: { email: 42, extra: "x", acceptedTerms: true, wantsFaktura: true },
    });
    expect(parseDraft(raw, "c1", defaults)).toEqual({ step: 3, data: { wantsFaktura: true } });
  });

  it("falls back to step 1 for an invalid step", () => {
    expect(parseDraft(stored({ cartId: "c1", step: 9, data: {} }), "c1", defaults)?.step).toBe(1);
  });
});
