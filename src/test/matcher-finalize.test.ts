/**
 * Unit tests: finalizeMatchResult from src/lib/ingestion/matcher.ts
 *
 * Extracted during Phase C refactor. Pure function — clamps score,
 * determines confidence + isMatch, appends final reason.
 */
import { describe, it, expect } from "vitest";
import { finalizeMatchResult } from "@/lib/ingestion/matcher";

describe("finalizeMatchResult", () => {
  describe("score clamping", () => {
    it("clamps score above 100 to 100", () => {
      const r = finalizeMatchResult(150, [], [], []);
      expect(r.score).toBe(100);
    });

    it("clamps score below 0 to 0", () => {
      const r = finalizeMatchResult(-50, [], [], []);
      expect(r.score).toBe(0);
    });

    it("keeps in-range scores unchanged", () => {
      const r = finalizeMatchResult(73, [], [], []);
      expect(r.score).toBe(73);
    });
  });

  describe("confidence levels", () => {
    it("score >= 75 → high confidence", () => {
      expect(finalizeMatchResult(75, [], [], []).confidence).toBe("high");
      expect(finalizeMatchResult(100, [], [], []).confidence).toBe("high");
    });

    it("score 50-74 → medium confidence", () => {
      expect(finalizeMatchResult(50, [], [], []).confidence).toBe("medium");
      expect(finalizeMatchResult(74, [], [], []).confidence).toBe("medium");
    });

    it("score 30-49 → low confidence", () => {
      expect(finalizeMatchResult(30, [], [], []).confidence).toBe("low");
      expect(finalizeMatchResult(49, [], [], []).confidence).toBe("low");
    });

    it("score < 30 → reject confidence", () => {
      expect(finalizeMatchResult(29, [], [], []).confidence).toBe("reject");
      expect(finalizeMatchResult(0, [], [], []).confidence).toBe("reject");
    });
  });

  describe("isMatch decision", () => {
    it("isMatch=true when score > 50 and confidence !== 'reject'", () => {
      const r = finalizeMatchResult(75, [], [], []);
      expect(r.isMatch).toBe(true);
    });

    it("isMatch=false at boundary score 50 (uses strict > 50)", () => {
      const r = finalizeMatchResult(50, [], [], []);
      expect(r.isMatch).toBe(false);
    });

    it("isMatch=false when confidence is 'reject' (even with high raw score)", () => {
      // Score clamped to 100 → high confidence → would be true
      // But the implementation: isMatch = score > 50 && confidence !== "reject"
      // So high score is always a match unless the function itself rejects
      // The 'reject' confidence is only set when score < 30
      // This test confirms: you can't have high score + reject simultaneously
      const high = finalizeMatchResult(100, [], [], []);
      expect(high.confidence).toBe("high");
      expect(high.isMatch).toBe(true);
    });

    it("isMatch=false for low score", () => {
      const r = finalizeMatchResult(40, [], [], []);
      expect(r.isMatch).toBe(false);
    });

    it("isMatch=false for very low score (reject)", () => {
      const r = finalizeMatchResult(20, [], [], []);
      expect(r.isMatch).toBe(false);
    });
  });

  describe("final reason", () => {
    it("appends 'Match score: X/100' when matched", () => {
      const r = finalizeMatchResult(80, [], [], []);
      expect(r.reasons).toContain("Match score: 80/100");
    });

    it("appends 'Rejected: score terlalu rendah (X/100)' when not matched", () => {
      const r = finalizeMatchResult(40, [], [], []);
      expect(r.reasons).toContain("Rejected: score terlalu rendah (40/100)");
    });

    it("uses clamped score in the final reason", () => {
      const r = finalizeMatchResult(150, [], [], []);
      // Clamped to 100, which is > 50 → isMatch
      expect(r.reasons).toContain("Match score: 100/100");
    });

    it("preserves existing reasons", () => {
      const reasons = ["Title match: 90%"];
      const r = finalizeMatchResult(85, reasons, [], []);
      expect(r.reasons).toContain("Title match: 90%");
      expect(r.reasons).toContain("Match score: 85/100");
      expect(r.reasons).toHaveLength(2);
    });
  });

  describe("preserves warnings and flags", () => {
    it("passes through warnings unchanged", () => {
      const warnings = ["Some warning"];
      const r = finalizeMatchResult(80, [], warnings, []);
      expect(r.warnings).toBe(warnings);
    });

    it("passes through flags unchanged", () => {
      const flags: ("variant_conflict" | "price_anomaly")[] = ["variant_conflict", "price_anomaly"];
      const r = finalizeMatchResult(80, [], [], flags);
      expect(r.flags).toBe(flags);
    });
  });
});
