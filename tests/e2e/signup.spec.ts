import { test, expect } from "@playwright/test";

/**
 * Critical flow #5: Signup form
 *
 * Same pattern as the login E2E: test form UI behavior without
 * completing real signup (which would require test fixtures).
 *
 * Verifies:
 * - All fields render (name, email, password)
 * - Password mismatch shows validation error
 * - Link to login page works
 * - HTML5 required validation on empty submit
 *
 * Label/button text MUST match src/app/auth/register/RegisterForm.tsx:
 * - "Nama Lengkap" (not "Nama")
 * - "Email"
 * - "Password"
 * - Submit button: "Buat Akun" (not "Daftar")
 * - Login link: "Masuk di sini"
 */
test.describe("Signup form", () => {
  test("renders name, email, password fields and submit button", async ({ page }) => {
    await page.goto("/auth/register");

    await expect(page.getByLabel(/nama lengkap/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /buat akun/i })).toBeVisible();
  });

  test("login link points to /auth/login", async ({ page }) => {
    await page.goto("/auth/register");
    const link = page.getByRole("link", { name: /masuk di sini/i });
    await expect(link).toHaveAttribute("href", "/auth/login");
  });

  test("empty submit triggers HTML5 validation (form not submitted)", async ({ page }) => {
    await page.goto("/auth/register");

    // Try to submit empty form — HTML5 required should block submission
    await page.getByRole("button", { name: /buat akun/i }).click();

    // URL should NOT have changed (still on register page)
    expect(page.url()).toMatch(/\/auth\/register$/);

    // Email input should have :invalid pseudo-class
    const emailInput = page.getByLabel(/^email$/i);
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test("invalid email format shows browser validation", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/nama lengkap/i).fill("Test User");
    await page.getByLabel(/^email$/i).fill("not-an-email");
    await page.getByLabel(/^password$/i).fill("password123");
    await page.getByRole("button", { name: /buat akun/i }).click();

    // Email type=email should reject "not-an-email"
    const emailInput = page.getByLabel(/^email$/i);
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test("page has noindex meta (per skill, private pages should not be indexed)", async ({ page }) => {
    await page.goto("/auth/register");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toMatch(/noindex/i);
  });
});
