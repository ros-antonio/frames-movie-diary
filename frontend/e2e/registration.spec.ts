import { test, expect } from '@playwright/test';

test.describe('Feature 1: User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('registers successfully with valid data', async ({ page }) => {
    await page.locator('#name').fill('John Cinephile');
    await page.locator('#email').fill('john@example.com');
    await page.locator('#password').fill('SecurePass123');
    await page.locator('#confirmPassword').fill('SecurePass123');

    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL('/diary');
    await expect(page.getByRole('heading', { name: 'Movie Diary' })).toBeVisible();
  });

  test('blocks registration when passwords do not match', async ({ page }) => {
    await page.locator('#name').fill('Jane Smith');
    await page.locator('#email').fill('jane@example.com');
    await page.locator('#password').fill('SecurePass123');
    await page.locator('#confirmPassword').fill('DifferentPass456');

    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  });

  test('blocks registration with invalid email', async ({ page }) => {
    await page.locator('#name').fill('Bad Email User');
    await page.locator('#email').fill('not-a-valid-email');
    await page.locator('#password').fill('ValidPass123');
    await page.locator('#confirmPassword').fill('ValidPass123');

    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL('/register');
  });

  test('navigates to login from register page', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
});

