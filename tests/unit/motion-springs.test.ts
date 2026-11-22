import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Storefront motion rule (DESIGN.md §6): anything that moves (transform,
// translate, scale, rotate) runs on a spring token — spring, spring-snappy,
// spring-bouncy — or on transition-press. Admin code is out of scope.
const SPRING = /(?<![\w:-])(spring(-snappy|-bouncy)?|transition-press)(?![\w-])/;
const MOVING_TRANSITION =
  /(?<![\w:-])transition-(transform|\[[^\]]*(transform|scale|translate)[^\]]*\])(?![\w-])/;
const STRING = /"[^"\n]*"|`[^`]*`/g;

// Admin-only files: everything globals.css keeps out of the storefront bundle
const adminOnly = [
  ...readFileSync("src/app/globals.css", "utf8").matchAll(/@source not "\.\.\/(.+?)"/g),
].map(([, path]) => `src/${path}`);
const files = globSync("src/**/*.tsx").filter(
  (f) =>
    !f.startsWith("src/app/admin") &&
    !f.endsWith("ui/button.tsx") &&
    !adminOnly.some((p) => f === p || f.startsWith(`${p}/`)),
);

describe("storefront motion uses springs", () => {
  it("has files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("every moving transition carries a spring token", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const [cls] of src.matchAll(STRING)) {
        if (MOVING_TRANSITION.test(cls) && !SPRING.test(cls)) {
          offenders.push(`${file}: ${cls.slice(0, 120)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no hand-rolled cubic-bezier on the storefront", () => {
    const offenders = files.filter((f) => readFileSync(f, "utf8").includes("cubic-bezier"));
    expect(offenders).toEqual([]);
  });
});
