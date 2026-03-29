import { test, expect } from '@playwright/test';

async function registerAndOpenDiary(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.locator('#name').fill('Movie Enthusiast');
  await page.locator('#email').fill('movies@example.com');
  await page.locator('#password').fill('MoviePass123');
  await page.locator('#confirmPassword').fill('MoviePass123');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/diary');
}

async function addMovie(page: import('@playwright/test').Page, movieName: string, watchDate: string, rating?: string, review?: string) {
  await page.getByRole('button', { name: 'Log New Movie' }).click();
  await expect(page).toHaveURL('/diary/new');

  await page.locator('input[type="text"]').first().fill(movieName);
  await page.locator('input[type="date"]').fill(watchDate);

  if (rating) {
    await page.locator('input[type="number"]').fill(rating);
  }
  if (review) {
    await page.locator('textarea').fill(review);
  }

  await page.getByRole('button', { name: /Save Movie/i }).click();
  await expect(page).toHaveURL('/diary');
}

test.describe('Feature 2: Movie Diary Management', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndOpenDiary(page);
  });

  test('adds a new movie entry and shows it in diary', async ({ page }) => {
    await addMovie(page, 'The Shawshank Redemption', '2024-01-15', '5', 'A masterpiece');

    await expect(page.getByText('The Shawshank Redemption')).toBeVisible();
  });

  test('opens movie details after selecting a movie', async ({ page }) => {
    await addMovie(page, 'Inception', '2024-02-20', '4.5', 'Mind-bending cinematography');

    await page.getByText('Inception').first().click();

    await expect(page.getByRole('heading', { name: 'Inception' })).toBeVisible();
    await expect(page.getByText('Mind-bending cinematography')).toBeVisible();
  });

  test('edits an existing movie entry', async ({ page }) => {
    await addMovie(page, 'Editable Movie', '2024-04-05', '4', 'Original review');

    await page.getByText('Editable Movie').first().click();
    await page.getByTitle('Edit Movie').click();

    await expect(page.getByRole('heading', { name: 'Edit Movie' })).toBeVisible();
    await page.locator('textarea').fill('Updated review after rewatching');
    await page.getByRole('button', { name: /Update Movie/i }).click();

    await expect(page.getByText('Updated review after rewatching')).toBeVisible();
  });

  test('deletes a movie entry and returns to diary', async ({ page }) => {
    await addMovie(page, 'Deletable Movie', '2024-03-10', '3', 'This movie will be deleted');

    await page.getByText('Deletable Movie').first().click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTitle('Delete Movie').click();

    await expect(page).toHaveURL('/diary');
    await expect(page.getByText('Deletable Movie')).toHaveCount(0);
  });
});

