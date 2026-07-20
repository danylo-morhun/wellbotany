import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "@/lib/sanitize";

describe("sanitizeRichText", () => {
  it("strips malicious script tags and inline handlers", () => {
    const dirty =
      '<p>Healthy supplement</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />';
    const clean = sanitizeRichText(dirty);

    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onerror");
    expect(clean).toContain("<p>Healthy supplement</p>");
  });

  it("preserves safe HTML formatting tags and attributes", () => {
    const html = '<h2>Active Ingredients</h2><p class="text-sm">Vitamin C 1000mg</p>';
    const clean = sanitizeRichText(html);

    expect(clean).toBe(html);
  });

  it("forces rel='noopener noreferrer' on external links", () => {
    const html = '<a href="https://example.com" target="_blank">Certificate</a>';
    const clean = sanitizeRichText(html);

    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('href="https://example.com"');
  });
});
