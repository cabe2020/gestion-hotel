import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Hosterix/);
  });

  test('should navigate to signin', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/auth/signin"]');
    await expect(page).toHaveURL(/.*auth\/signin/);
  });

  test('should navigate to signup', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/auth/signup"]');
    await expect(page).toHaveURL(/.*auth\/signup/);
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

test.describe('Health Check', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});