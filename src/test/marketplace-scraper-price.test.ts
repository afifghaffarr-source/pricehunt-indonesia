import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as vm from "node:vm";

// `vm` reserved import kept for parity with other test files; not used here
// because we extract the function body via re-parse + `new Function`.
void vm;

/**
 * Regression guard for the Shopee price-extraction bug.
 *
 * 2026-06-29: extension v3.0.1 was sending laptop prices like
 * "Rp 1.045.994.000" instead of the real "Rp 13.094.500", because
 * marketplace-scraper.parsePriceIDR used a greedy regex that matched
 * across multiple price fragments (e.g. "Rp13.094.500" + "Rp1.309.450/bln"
 * inside the same parent element), concatenating them into a 100× inflated
 * number.
 *
 * The fix: anchor on `\d{1,3}(?:\.\d{3})+` (forces a single triplet
 * grouping), require at least one thousands group, and reject anything
 * outside [Rp1.000, Rp1.000.000.000]. Below we extract the function from
 * the source file via a simple regex so we test the actual production
 * code, not a copy.
 */

function loadParsePriceIDR(): (text: unknown) => number | null {
  const src = readFileSync(
    resolve(process.cwd(), "extension/marketplace-scraper.js"),
    "utf-8",
  );

  // Match the function declaration. Its body is exposed via a balanced
  // scan because the original parser isn't installed in this project.
  const start = src.indexOf("function parsePriceIDR(text)");
  if (start === -1) throw new Error("parsePriceIDR not found in source");

  // Walk braces from the opening `{` after `parsePriceIDR(text)` to find
  // the matching `}`. Strings/regexes inside can contain `{` so we
  // approximate: count `{` vs `}` ignoring those inside `'`/`"`/`/`/regex.
  const braceStart = src.indexOf("{", start);
  let depth = 0;
  let i = braceStart;
  let inString: false | "'" | '"' | "`" | "/" = false;
  while (i < src.length) {
    const c = src[i];
    if (inString) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === inString) inString = false;
    } else {
      if (c === "'" || c === '"' || c === "`") {
        inString = c;
      } else if (c === "/" && src[i + 1] === "/") {
        // line comment
        const nl = src.indexOf("\n", i);
        i = nl === -1 ? src.length : nl;
        continue;
      } else if (c === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end === -1 ? src.length : end + 2;
        continue;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) {
          const fnSrc = src.slice(start, i + 1);
          // Wrap so we can call it.
          const factory = new Function(
            `${fnSrc}\nreturn parsePriceIDR;`,
          );
          return factory() as (text: unknown) => number | null;
        }
      }
    }
    i++;
  }
  throw new Error("parsePriceIDR body never closed");
}

let parsePriceIDR: (text: unknown) => number | null;

describe("parsePriceIDR — Shopee price extraction (regression guard)", () => {
  it("loads from extension/marketplace-scraper.js", () => {
    parsePriceIDR = loadParsePriceIDR();
    expect(typeof parsePriceIDR).toBe("function");
  });

  describe("valid price formats", () => {
    const cases: Array<[string, number]> = [
      ["Rp1.234.000", 1_234_000],
      ["Rp 1.234.000", 1_234_000],
      ["Rp. 1.234.000", 1_234_000],
      ["1.234.000", 1_234_000],
      ["99.999", 99_999],
      ["Rp13.094.500", 13_094_500],
      [" Rp  13.094.500  ", 13_094_500],
      ["Rp150.000", 150_000],
    ];
    for (const [input, expected] of cases) {
      it(`returns ${expected.toLocaleString("id-ID")} for "${input}"`, () => {
        expect(parsePriceIDR(input)).toBe(expected);
      });
    }
  });

  describe("Shopee installment-bug regression (was: 100× wrong)", () => {
    const cases: Array<[string, number, string]> = [
      ["Rp13.094.500Rp1.309.450/bln", 13_094_500, "cicilan suffix must not bleed"],
      ["Rp 13.094.500 Rp 1.309.450 /bln", 13_094_500, "cicilan with spaces"],
      ["13.094.5001.309.450", 13_094_500, "digits glued, take first triplet"],
      ["Rp1.045.994Rp104.599/bln", 1_045_994, "HP laptop, was 1.045.994.000 by old regex"],
      ["13.094.500.00", 13_094_500, "trailing zero fragment"],
      ["Rp13.094.500IDR", 13_094_500, "currency code suffix"],
    ];
    for (const [input, expected, desc] of cases) {
      it(`returns ${expected.toLocaleString("id-ID")} for "${input}" — ${desc}`, () => {
        expect(parsePriceIDR(input)).toBe(expected);
      });
    }
  });

  describe("out-of-range guard rejects reconciliation bugs", () => {
    const cases: Array<[unknown, string]> = [
      ["Rp999", "below Rp1.000 minimum"],
      ["Rp1.000.000.001", "above Rp1 milyar cap"],
      ["Rp0", "zero"],
      ["", "empty string"],
      [null, "null input"],
    ];
    for (const [input, desc] of cases) {
      it(`rejects "${String(input)}" — ${desc}`, () => {
        expect(parsePriceIDR(input)).toBe(null);
      });
    }
  });
});
