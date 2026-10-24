import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/consent/actions", () => ({ recordConsent: vi.fn() }));

async function load(marketing: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS_ID", marketing ? "AW-123" : "");
  vi.stubEnv("NEXT_PUBLIC_META_ENABLED", "");
  return import("@/lib/consent");
}

afterEach(() => vi.unstubAllEnvs());

describe("parseConsent", () => {
  it("reads v2 choices", async () => {
    const { parseConsent } = await load(true);
    expect(parseConsent('{"analytics":true,"marketing":false,"v":2,"id":"abc12345"}')).toEqual({
      analytics: true,
      marketing: false,
      v: 2,
      id: "abc12345",
    });
  });

  it("maps v1 values: accepted covered analytics only", async () => {
    const { parseConsent } = await load(true);
    expect(parseConsent("accepted")).toMatchObject({ analytics: true, marketing: false });
    expect(parseConsent("rejected")).toMatchObject({ analytics: false, marketing: false });
  });

  it("rejects missing or malformed values", async () => {
    const { parseConsent } = await load(true);
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("{oops")).toBeNull();
    expect(parseConsent('{"analytics":"yes","marketing":true}')).toBeNull();
  });
});

describe("needsConsentPrompt", () => {
  it("asks first-time visitors", async () => {
    const { needsConsentPrompt } = await load(false);
    expect(needsConsentPrompt(null)).toBe(true);
  });

  it("re-asks a v1 accept once the marketing category exists", async () => {
    expect((await load(true)).needsConsentPrompt("accepted")).toBe(true);
    expect((await load(false)).needsConsentPrompt("accepted")).toBe(false);
  });

  it("never re-asks a refusal or a v2 choice", async () => {
    const { needsConsentPrompt } = await load(true);
    expect(needsConsentPrompt("rejected")).toBe(false);
    expect(needsConsentPrompt('{"analytics":false,"marketing":false,"v":2,"id":"x"}')).toBe(false);
  });
});
