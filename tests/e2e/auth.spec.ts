import { test, expect } from "@playwright/test";

/**
 * Critical flow #4: Login form
 *
 * The form uses Next.js useActionState + a server action.
 * We test the form's UI behavior:
 *   - Fields render
 *   - HTML5 validation kicks in for empty submit
 *   - Invalid credentials show an error
 *   - Links to forgot-password and register work
 *
 * We do NOT test successful login (would require test fixtures / a
 * dedicated E2E user account).
 */
test.describe("Login form", () => {
  test("renders email + password fields and submit button", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^masuk$/i })
    ).toBeVisible();
  });

  test("forgot password link points to /auth/forgot-password", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    const link = page.getByRole("link", { name: /lupa password/i });
    await expect(link).toHaveAttribute("href", "/auth/forgot-password");
  });

  test("register link points to /auth/register", async ({ page }) => {
    await page.goto("/auth/login");
    const link = page.getByRole("link", { name: /daftar sekarang/i });
    await expect(link).toHaveAttribute("href", "/auth/register");
  });

  test("empty submit triggers HTML5 validation (form not submitted)", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    // Email + password are required → submitting empty should not navigate
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Still on login page (form didn't submit successfully)
    await page.waitForTimeout(500);
    expect(page.url()).toContain("/auth/login");
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel(/^email$/i).fill("nope+test@example.com");
    await page.getByLabel(/^password$/i).fill("wrong-password-12345");
    await page.getByRole("button", { name: /^masuk$/i }).click();

    // Server action returns error; useActionState updates the UI
    // Supabase returns "Invalid login credentials" → wrapped as
    // "Login gagal: Invalid login credentials"
    // The error renders inside the <form> ancestor.
    const errorText = page.locator("form").getByText(/login gagal/i);
    await expect(errorText).toBeVisible({ timeout: 15_000 });
  });
});
