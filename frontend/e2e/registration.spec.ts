import { test, expect } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function openRegister(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL('/register');
}

async function register(page: import('@playwright/test').Page, email: string) {
  await page.locator('#name').fill('John Cinephile');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('SecurePass123');
  await page.locator('#confirmPassword').fill('SecurePass123');
  await page.locator('form button[type="submit"]').click();
}

async function logout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page).toHaveURL('/');
}

async function openLogin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('/login');
}

test.describe('Authentication flows', () => {
  test('registers successfully with valid data', async ({ page }) => {
    await openRegister(page);
    await register(page, uniqueEmail('register'));

    await expect(page).toHaveURL('/diary');
    await expect(page.getByRole('heading', { name: 'Movie Diary' })).toBeVisible();
  });

  test('blocks duplicate registration through the backend', async ({ page }) => {
    const email = uniqueEmail('duplicate');

    await openRegister(page);
    await register(page, email);
    await expect(page).toHaveURL('/diary');

    await logout(page);
    await openRegister(page);
    await register(page, email);

    await expect(page.getByRole('alert')).toContainText('Email already registered');
    await expect(page).toHaveURL('/register');
  });

  test('logs in with an existing backend account after logout', async ({ page }) => {
    const email = uniqueEmail('login');

    await openRegister(page);
    await register(page, email);
    await expect(page).toHaveURL('/diary');

    await logout(page);
    await openLogin(page);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('SecurePass123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/diary');
    await expect(page.getByRole('heading', { name: 'Movie Diary' })).toBeVisible();
  });

  test('shows an error for invalid login credentials', async ({ page }) => {
    const email = uniqueEmail('invalid-login');

    await openRegister(page);
    await register(page, email);
    await expect(page).toHaveURL('/diary');

    await logout(page);
    await openLogin(page);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('WrongPass123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
    await expect(page).toHaveURL('/login');
  });
});
