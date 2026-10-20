import { expect, test, type Page } from '@playwright/test';

const borrowerEmail = process.env.E2E_BORROWER_EMAIL ?? 'borrower@gearflow.test';
const staffEmail = process.env.E2E_STAFF_EMAIL ?? 'staff@gearflow.test';
const demoPassword = process.env.E2E_DEMO_PASSWORD ?? 'GearFlow-demo-1';

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL,
  'Set PLAYWRIGHT_BASE_URL to a seeded GearFlow deployment.',
);

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(demoPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment', exact: true })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
}

function futureDateRange() {
  const runId = process.env.E2E_RUN_ID ?? String(Date.now());
  const hash = [...runId].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 90 + (hash % 3650));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
  return { startDate: dateOnly(start), endDate: dateOnly(end) };
}

test('a deployed staging booking can be requested, approved and cancelled', async ({ page }) => {
  const { startDate, endDate } = futureDateRange();

  await signIn(page, borrowerEmail);
  const catalogue = page.getByRole('region', { name: 'Equipment catalogue' });
  const equipmentCard = catalogue
    .getByRole('link')
    .filter({ hasText: 'Open for requests' })
    .first();
  await expect(equipmentCard).toBeVisible();
  const equipmentName = (await equipmentCard.getByRole('heading').textContent())?.trim();
  expect(equipmentName).toBeTruthy();
  await equipmentCard.click();

  await page.getByLabel('Start date').fill(startDate);
  await page.getByLabel('End date').fill(endDate);
  await page.getByRole('button', { name: 'Request booking' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is in.' })).toBeVisible();
  await page.getByRole('link', { name: 'View my bookings' }).click();

  let bookingRow = page
    .getByRole('row')
    .filter({ hasText: equipmentName! })
    .filter({ has: page.locator(`time[datetime="${startDate}"]`) })
    .filter({ hasText: 'Pending review' });
  await expect(bookingRow).toBeVisible();
  await signOut(page);

  await signIn(page, staffEmail);
  await page.getByRole('link', { name: 'Pending requests', exact: true }).click();
  await page.getByPlaceholder('Search equipment or borrower').fill(borrowerEmail);
  bookingRow = page
    .getByRole('row')
    .filter({ hasText: equipmentName! })
    .filter({ has: page.locator(`time[datetime="${startDate}"]`) })
    .filter({ hasText: borrowerEmail });
  await expect(bookingRow).toBeVisible();
  await bookingRow.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve request' }).click();
  await expect(page.getByRole('status')).toContainText('Booking approved');
  await signOut(page);

  await signIn(page, borrowerEmail);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My bookings', exact: true })
    .click();
  bookingRow = page
    .getByRole('row')
    .filter({ hasText: equipmentName! })
    .filter({ has: page.locator(`time[datetime="${startDate}"]`) })
    .filter({ hasText: 'Ready to collect' });
  await expect(bookingRow).toBeVisible();
  await bookingRow.getByRole('button', { name: 'Cancel booking' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel booking' }).click();
  await expect(page.getByRole('status')).toContainText('cancelled');

  await page.getByRole('button', { name: 'Past', exact: true }).click();
  bookingRow = page
    .getByRole('row')
    .filter({ hasText: equipmentName! })
    .filter({ has: page.locator(`time[datetime="${startDate}"]`) })
    .filter({ hasText: 'Cancelled' });
  await expect(bookingRow).toBeVisible();
});
