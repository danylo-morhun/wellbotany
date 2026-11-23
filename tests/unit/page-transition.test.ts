import { describe, expect, it } from "vitest";
import { disableViewTransitionsInFirefox } from "@/components/layout/PageTransition";

const FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:146.0) Gecko/20100101 Firefox/146.0";
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const FIREFOX_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/146.0 Mobile/15E148 Safari/605.1.15";

function fakeDocument(userAgent: string) {
  const startViewTransition = () => ({});
  return { defaultView: { navigator: { userAgent } }, startViewTransition } as unknown as Document;
}

describe("disableViewTransitionsInFirefox", () => {
  it("removes startViewTransition in desktop Firefox", () => {
    const doc = fakeDocument(FIREFOX);
    disableViewTransitionsInFirefox(doc);
    expect(typeof doc.startViewTransition).not.toBe("function");
  });

  it.each([CHROME, FIREFOX_IOS])("keeps startViewTransition elsewhere", (ua) => {
    const doc = fakeDocument(ua);
    disableViewTransitionsInFirefox(doc);
    expect(typeof doc.startViewTransition).toBe("function");
  });
});
