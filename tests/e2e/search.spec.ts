import { test, expect } from "@playwright/test";

/**
 * Critical flow #2: Search
 *
 * Two sub-flows:
 *   - Direct URL access: /search?q=iphone (deep link)
 *   - Form submit: type → press Enter → navigates to /search?q=...
 */
test.describe("Search", () => {
  test("direct URL with query renders results", async ({ page }) => {
    await page.goto("/search?q=iphone");

    // Page heading
    await expect(
      page.getByRole("heading", { name: /cari produk|hasil/i })
    ).toBeVisible({ timeout: 10_000 });

    // Live region announces result count (a11y-A-1)
    const liveRegion = page.locator('[aria-live="polite"]').first();
    await expect(liveRegion).toBeVisible();
  });

  test("search via input navigates to /search?q=...", async ({ page }) => {
    await page.goto("/");

    const searchInput = page
      .getByPlaceholder(/cari produk/i)
      .first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill("samsung");
    await searchInput.press("Enter");

    // Should navigate to /search?q=samsung
    await page.waitForURL(/\/search\?q=samsung/);
    expect(page.url()).toContain("q=samsung");
  });

  test("empty search does not navigate", async ({ page }) => {
    await page.goto("/");

    const searchInput = page
      .getByPlaceholder(/cari produk/i)
      .first();
    await searchInput.fill("   "); // whitespace only
    await searchInput.press("Enter");

    // Should stay on home page
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain("/search");
  });
});
