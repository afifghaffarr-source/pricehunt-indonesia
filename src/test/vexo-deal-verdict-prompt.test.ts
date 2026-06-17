/**
 * v1.5.22 — Deal-verdict prompt regression test (BUG-23 fix).
 *
 * The AI deal-verdict prompt previously let the LLM hallucinate marketplace
 * names (it would answer "Tokopedia is best" even when Tokopedia was the most
 * expensive option). Root cause: the prompt asked the LLM to analyze data
 * that did NOT include per-marketplace data, so the model invented names.
 *
 * This test asserts the prompt explicitly tells the model NOT to mention
 * marketplace / store names. If this test ever fails, the AI is about to
 * start hallucinating names again and the product page is about to mislead
 * users.
 */
import { describe, it, expect, vi } from "vitest";

// We test the prompt by importing the module and reading the constant.
// Mock isVexoConfigured to false so the module loads without env vars.
vi.mock("@/lib/vexo/client", () => ({
  isVexoConfigured: () => false,
}));

import { getAIInsight } from "@/lib/marketplace/vexo-adapter";

describe("deal-verdict prompt (BUG-23 regression guard)", () => {
  it("tells the model NOT to mention marketplace or store names", async () => {
    // The module exports getAIInsight; we capture the prompt it builds by
    // hooking the Vexo client. Since isVexoConfigured() returns false,
    // getAIInsight returns null without calling the API — we just need
    // to verify the prompt is built correctly. We test this indirectly
    // by reading the source via a regex against the compiled module.
    // Read the source file directly to inspect the prompt
    const path = await import("node:path");
    const moduleSource = await import("node:fs").then((fs) =>
      fs.promises.readFile(
        path.resolve(process.cwd(), "src/lib/marketplace/vexo-adapter.ts"),
        "utf-8",
      ),
    );

    // Find the deal-verdict entry in the prompts record
    const match = moduleSource.match(
      /["']deal-verdict["']\s*:\s*`([^`]+)`/,
    );
    expect(match, "deal-verdict prompt must exist in vexo-adapter.ts").toBeTruthy();

    const prompt = match![1].toLowerCase();

    // The fix: prompt must forbid marketplace/store mentions
    expect(
      prompt,
      "prompt must tell the model not to mention marketplace names",
    ).toMatch(/jangan|don't|not.*mention|never.*mention/);

    expect(
      prompt,
      "prompt must reference marketplace or store in the forbidden set",
    ).toMatch(/marketplace|toko|store/);
  });

  it("getAIInsight returns null when Vexo is not configured (no network call)", async () => {
    const result = await getAIInsight(
      "deal-verdict",
      "Produk: Test. Harga terendah: Rp100.000",
    );
    expect(result).toBeNull();
  });
});
