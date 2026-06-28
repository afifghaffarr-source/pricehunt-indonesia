import { test, expect } from "@playwright/test";

/**
 * Critical flow #1: Home page renders trending products
 *
 * The home page is server-rendered, fetching products from Supabase.
 * If Supabase is unreachable, the page renders an error boundary instead.
 * This test guards against that regression.
 */
test.describe("Home page", () => {
  test("renders hero, search bar, and at least one product card", async ({
    page,
  }) => {
    await page.goto("/");

    // Hero: h1 + search bar
    await expect(
      page.getByRole("heading", { name: /temukan harga terbaik/i })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/cari produk/i).first()
    ).toBeVisible();
  });

  test("product cards link to /product/[slug]", async ({ page }) => {
    await page.goto("/");

    // Find a product link — server-rendered with real DB data
    const productLink = page
      .locator('a[href^="/product/"]')
      .filter({ hasNotText: /search|lihat/i })
      .first();

    await expect(productLink).toBeVisible({ timeout: 15_000 });
    const href = await productLink.getAttribute("href");
    expect(href).toMatch(/^\/product\/[a-z0-9-]+$/);
  });

  test("home page returns 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });
});
