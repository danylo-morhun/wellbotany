import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  currentStep,
  generateTotpSecret,
  openTotpSecret,
  otpauthUri,
  sealTotpSecret,
  totpAt,
  verifyTotp,
} from "@/features/auth/lib/totp";

// RFC 6238 appendix B (SHA1) — secret is ASCII "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const at = (seconds: number) => seconds * 1000;

describe("base32", () => {
  it("round-trips", () => {
    const buf = Buffer.from("12345678901234567890");
    expect(base32Encode(buf)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq")).toEqual(buf);
  });

  it("generates 160-bit secrets", () => {
    expect(base32Decode(generateTotpSecret())).toHaveLength(20);
  });
});

describe("totpAt", () => {
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("matches the RFC 6238 vector at T=%i", (seconds, code) => {
    expect(totpAt(RFC_SECRET, currentStep(at(seconds)))).toBe(code);
  });
});

describe("verifyTotp", () => {
  const now = at(1234567890);
  const step = currentStep(now);

  it("accepts the current code and returns its step", () => {
    expect(verifyTotp(RFC_SECRET, "005924", null, now)).toBe(step);
  });

  it("tolerates one step of clock drift either way", () => {
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 1), null, now)).toBe(step + 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 2), null, now)).toBeNull();
  });

  it("rejects a code that was already used", () => {
    expect(verifyTotp(RFC_SECRET, "005924", step, now)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyTotp(RFC_SECRET, "12345", null, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef", null, now)).toBeNull();
  });

  it("ignores spaces in the typed code", () => {
    expect(verifyTotp(RFC_SECRET, "005 924", null, now)).toBe(step);
  });
});

describe("sealed secrets", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-for-totp-sealing";
  });
  afterEach(() => {
    process.env.AUTH_SECRET = original;
  });

  it("round-trips and never stores the plain secret", () => {
    const secret = generateTotpSecret();
    const sealed = sealTotpSecret(secret);
    expect(sealed).not.toContain(secret);
    expect(openTotpSecret(sealed)).toBe(secret);
  });

  it("fails with a different AUTH_SECRET", () => {
    const sealed = sealTotpSecret(generateTotpSecret());
    process.env.AUTH_SECRET = "another-secret";
    expect(() => openTotpSecret(sealed)).toThrow();
  });
});

describe("otpauthUri", () => {
  it("builds the URI authenticator apps scan", () => {
    const uri = otpauthUri("JBSWY3DPEHPK3PXP", "admin@example.pl");
    expect(uri).toMatch(/^otpauth:\/\/totp\/Well%20Botany%3Aadmin%40example\.pl\?/);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Well+Botany");
  });
});
