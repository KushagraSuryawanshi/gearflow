import { expect, test, type Page } from '@playwright/test';
import { installContractFixture, signIn } from './contractFixture';

async function requestLaptop(page: Page) {
  await page.getByRole('link', { name: /MacBook Pro 14-inch/ }).click();
  await page.getByLabel('Start date').fill('2026-11-10');
  await page.getByLabel('End date').fill('2026-11-10');
  await page.getByRole('button', { name: 'Request booking', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your request is in.' })).toBeVisible();
}

test('borrower filters equipment, validates dates, requests and cancels a booking', async ({
  page,
}) => {
  const state = await installContractFixture(page);
  await page.goto('/');
  await signIn(page, 'borrower');
  await expect(page.getByRole('link', { name: 'Pending requests', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('c1');
  await expect(page.locator('.equipment-card')).toHaveCount(2);
  await page.getByLabel('Open for requests', { exact: true }).check();
  await expect(page.locator('.equipment-card')).toHaveCount(1);
  await page.getByLabel('Search equipment').fill('nothing matches');
  await expect(
    page.getByRole('heading', { name: 'No equipment matches your search' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.equipment-card')).toHaveCount(6);
  await page.getByRole('link', { name: /MacBook Pro 14-inch/ }).click();
  await page.getByLabel('Start date').fill('2026-11-10');
  await page.getByLabel('End date').fill('2026-11-09');
  await page.getByRole('button', { name: 'Request booking', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('end date must be on or after');
  expect(
    state.calls.filter((call) => call.method === 'POST' && call.path === '/bookings'),
  ).toHaveLength(0);
  await page.getByLabel('End date').fill('2026-11-10');
  await page.getByRole('button', { name: 'Request booking', exact: true }).click();
  await page.getByRole('link', { name: 'View my bookings' }).click();
  const row = page.getByRole('row').filter({ hasText: 'MacBook Pro' });
  await expect(row).toContainText('Pending review');
  await row.getByRole('button', { name: 'View booking details' }).click();
  await expect(page.getByRole('dialog')).toContainText('10 Nov 2026 to 10 Nov 2026');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await row.getByRole('button', { name: 'Cancel booking' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Your booking has been cancelled.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Past bookings', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'MacBook Pro' })).toContainText('Cancelled');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'MacBook Pro' })
      .getByRole('button', { name: 'Cancel booking' }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
});

test('a borrower request moves through staff approval, collection and return', async ({ page }) => {
  await installContractFixture(page);
  await page.goto('/');
  await signIn(page, 'borrower');
  await requestLaptop(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'staff');
  await page.getByRole('link', { name: 'Pending requests', exact: true }).click();
  let row = page.getByRole('row').filter({ hasText: 'MacBook Pro' });
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve request' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('link', { name: 'Active loans', exact: true }).click();
  row = page.getByRole('row').filter({ hasText: 'MacBook Pro' });
  await expect(row).toContainText('Ready to collect');
  await row.getByRole('button', { name: 'Record collection' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark as collected' }).click();
  await expect(row).toContainText('On loan');
  await row.getByRole('button', { name: 'Record return' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark as returned' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'borrower');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My bookings' })
    .click();
  await page.getByRole('button', { name: 'Past bookings', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'MacBook Pro' })).toContainText('Returned');
});

test('staff cannot self-approve, can reject requests and manage maintenance with booking history', async ({
  page,
}) => {
  await installContractFixture(page);
  await page.goto('/');
  await signIn(page, 'staff');
  await page.getByRole('link', { name: 'Pending requests', exact: true }).click();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'Sam Chen' })
      .getByRole('button', { name: 'Approve', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('row')
    .filter({ hasText: 'Canon EOS' })
    .getByRole('button', { name: 'Reject', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reject request' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Canon EOS' })).toHaveCount(0);
  await page.goto('/equipment/e1');
  await expect(page.getByRole('heading', { name: 'Booking history' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Alex Morgan' })).toContainText('Rejected');
  await page.getByRole('button', { name: 'Mark for maintenance', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark for maintenance' }).click();
  await expect(page.getByRole('button', { name: 'Request booking', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Make available', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make available' }).click();
  await expect(page.getByRole('button', { name: 'Request booking', exact: true })).toBeEnabled();
});

test('admin creates, edits and deletes equipment and categories; conflicts stay visible', async ({
  page,
}) => {
  await installContractFixture(page);
  await page.goto('/');
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Add category', exact: true }).click();
  await page.getByLabel('Category name').fill('Field recorders');
  await page.getByRole('dialog').getByRole('button', { name: 'Add category' }).click();
  await page.getByRole('button', { name: 'Edit Field recorders' }).click();
  await page.getByLabel('Category name').fill('Recorders');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Recorders', exact: true })).toBeVisible();
  await page.goto('/admin/equipment');
  await page.getByRole('button', { name: 'Add equipment', exact: true }).click();
  await page.getByLabel('Equipment name').fill('Zoom H6 #001');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption({ label: 'Recorders' });
  await page.getByLabel('Description').fill('Portable recorder and case.');
  await page.getByRole('dialog').getByRole('button', { name: 'Add equipment' }).click();
  await page.getByRole('button', { name: 'Edit Zoom H6 #001' }).click();
  await page.getByLabel('Equipment name').fill('Zoom H6 #002');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Zoom H6 #002' })).toContainText(
    'Recorders',
  );
  await page.getByRole('button', { name: 'Delete Canon EOS R6 #001', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete equipment' }).click();
  await expect(page.getByRole('alert')).toContainText('booking records cannot be deleted');
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByRole('button', { name: 'Delete Zoom H6 #002' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete equipment' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Zoom H6 #002' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Recorders', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete category' }).click();
  await expect(page.getByRole('heading', { name: 'Recorders', exact: true })).toHaveCount(0);
});

test('role changes refresh the current session and protected pages stay restricted', async ({
  page,
}) => {
  const state = await installContractFixture(page);
  await page.goto('/');
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'People & roles' }).click();
  await page.getByRole('button', { name: 'Change role for Alex Morgan' }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Role', exact: true })
    .selectOption('STAFF');
  await page.getByRole('button', { name: 'Save role' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Alex Morgan' })).toContainText('Staff');
  await page.getByRole('button', { name: 'Change role for Jamie Lee' }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Role', exact: true })
    .selectOption('BORROWER');
  await expect(page.getByRole('dialog')).toContainText('remove your access');
  await page.getByRole('button', { name: 'Save role' }).click();
  await expect(page.getByRole('heading', { name: 'Find your next piece of kit.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'People & roles' })).toHaveCount(0);
  const before = state.calls.filter((call) => call.path === '/users').length;
  await page.goto('/admin/users');
  await expect(
    page.getByRole('heading', { name: 'This page needs a different role' }),
  ).toBeVisible();
  expect(state.calls.filter((call) => call.path === '/users')).toHaveLength(before);
});

test('API failures preserve dates, support retry and expire an invalid session', async ({
  page,
}) => {
  const state = await installContractFixture(page);
  await page.goto('/');
  await page.getByLabel('Email address').fill('alex@example.test');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('email or password is incorrect');
  await signIn(page, 'borrower');
  await page.getByRole('link', { name: /MacBook Pro 14-inch/ }).click();
  await page.getByLabel('Start date').fill('2026-11-10');
  await page.getByLabel('End date').fill('2026-11-12');
  state.failures.set('POST /bookings', {
    status: 409,
    code: 'BOOKING_CONFLICT',
    message: 'This equipment is already booked for the selected dates.',
  });
  await page.getByRole('button', { name: 'Request booking', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already booked for the selected dates');
  await expect(page.getByLabel('End date')).toHaveValue('2026-11-12');
  state.failures.set('GET /bookings/mine', {
    status: 503,
    code: 'UNAVAILABLE',
    message: 'The booking service is unavailable. Try again shortly.',
  });
  await page.getByRole('link', { name: 'My bookings', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('booking service is unavailable');
  state.failures.delete('GET /bookings/mine');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  state.failures.set('GET /bookings/mine', {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Session expired.',
  });
  await page.getByRole('button', { name: 'Refresh bookings' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Your session has expired');
  expect(await page.evaluate(() => sessionStorage.getItem('gearflow.token'))).toBeNull();
});

test('desktop and mobile layouts stay usable with keyboard navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installContractFixture(page);
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true });
  await signIn(page, 'borrower');
  await expect(page.locator('.equipment-card')).toHaveCount(6);
  await page.screenshot({ path: testInfo.outputPath('catalogue-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('catalogue-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'My bookings' }).click();
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('bookings-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'staff');
  await page.getByRole('link', { name: 'Pending requests', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('requests-desktop.png'), fullPage: true });
  await page.goto('/equipment/e1');
  await expect(page.getByRole('heading', { name: 'Booking history' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('equipment-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'admin');
  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('users-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});
