import { test, expect } from '@playwright/test';

async function registerAndOpenDiary(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.locator('#name').fill('Stats Tracker');
  await page.locator('#email').fill('stats@example.com');
  await page.locator('#password').fill('StatsPass123');
  await page.locator('#confirmPassword').fill('StatsPass123');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/diary');
}

async function addMovie(page: import('@playwright/test').Page, title: string, date: string, rating: string) {
  await page.getByRole('button', { name: 'Log New Movie' }).click();
  await page.locator('input[type="text"]').first().fill(title);
  await page.locator('input[type="date"]').fill(date);
  await page.locator('input[type="number"]').fill(rating);
  await page.getByRole('button', { name: /Save Movie/i }).click();
  await expect(page).toHaveURL('/diary');
}

test.describe('Feature 3: Statistics and Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndOpenDiary(page);

    await addMovie(page, 'Action Movie', '2024-01-10', '5');
    await addMovie(page, 'Drama Film', '2024-01-20', '4');
    await addMovie(page, 'Comedy Show', '2024-02-05', '3.5');
  });

  test('shows statistics page with expected sections', async ({ page }) => {
    await page.getByRole('button', { name: 'Statistics' }).click();

    await expect(page).toHaveURL('/statistics');
    await expect(page.getByRole('heading', { name: 'Rating Statistics' })).toBeVisible();
    await expect(page.getByText('Total Movies')).toBeVisible();
    await expect(page.getByText('Average Rating')).toBeVisible();
    await expect(page.getByText('Rating Distribution')).toBeVisible();
  });

  test('computes aggregate values from logged movies', async ({ page }) => {
    await page.getByRole('button', { name: 'Statistics' }).click();

    const totalMoviesValue = page
      .locator('p', { hasText: 'Total Movies' })
      .locator('xpath=following-sibling::p[1]');
    await expect(totalMoviesValue).toHaveText('3');
    await expect(page.getByText('4.2 ★')).toBeVisible();
  });

  test('updates totals after adding another movie', async ({ page }) => {
    await page.getByRole('button', { name: 'Log New Movie' }).click();
    await page.locator('input[type="text"]').first().fill('New Movie For Stats');
    await page.locator('input[type="date"]').fill('2024-04-10');
    await page.locator('input[type="number"]').fill('4');
    await page.getByRole('button', { name: /Save Movie/i }).click();

    await page.getByRole('button', { name: 'Statistics' }).click();
    const totalMoviesValue = page
      .locator('p', { hasText: 'Total Movies' })
      .locator('xpath=following-sibling::p[1]');
    await expect(totalMoviesValue).toHaveText('4');

    await page.getByRole('button', { name: 'Back to Diary' }).click();
    await expect(page).toHaveURL('/diary');
  });
});

