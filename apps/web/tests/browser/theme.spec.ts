import { expect, test } from '@playwright/test';
import { installContractFixture, signIn } from './contractFixture';

test('theme preference survives sign-in, navigation and reloads without clearing a booking form', async ({
  page,
}) => {
  await installContractFixture(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByLabel('Email address')).toHaveCSS('color-scheme', 'dark');
  await signIn(page, 'borrower');
  await page.getByRole('link', { name: /MacBook Pro 14-inch/ }).click();
  await page.getByLabel('Start date').fill('2026-11-10');
  await page.getByLabel('End date').fill('2026-11-11');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.getByLabel('Start date')).toHaveValue('2026-11-10');
  await expect(page.getByLabel('End date')).toHaveValue('2026-11-11');
  await expect(page.getByLabel('Start date')).toHaveCSS('color-scheme', 'light');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('system appearance works without storage and the theme control remains usable on mobile', async ({
  page,
}) => {
  await installContractFixture(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await signIn(page, 'admin');
  const toggle = page.getByRole('button', { name: 'Switch to dark theme' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(32, 37, 31)');
  await page.getByRole('link', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});
