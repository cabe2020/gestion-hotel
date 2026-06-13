import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should redirect to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('Sign In Page', () => {
  test('should show signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Credenciales')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sign Up Page', () => {
  test('should show signup form step 1', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('input[placeholder="Hotel Paraíso"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});