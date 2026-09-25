export type FaqRow = { q: string; a: string };

/** FAQ textarea format: blocks separated by a blank line, first line = question. */
export function faqToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as FaqRow[]).map((row) => `${row.q}\n${row.a}`).join("\n\n");
}

export function textToFaq(text: string): FaqRow[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length >= 2)
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join(" ").trim() }));
}
