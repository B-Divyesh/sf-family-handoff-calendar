import { expect, test } from '@playwright/test';
import axe from 'axe-core';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('creates an owned handoff and keeps it after reload', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page.getByRole('button', { name: 'Add first member' }).click();
  await page.getByLabel('Name or role').fill('Alex');
  await page.getByRole('button', { name: 'Save member' }).click();
  await page.getByRole('button', { name: 'Household' }).click();
  await page.getByRole('button', { name: 'Add member' }).click();
  await page.getByLabel('Name or role').fill('Sam');
  await page.getByRole('button', { name: 'Save member' }).click();
  await page.getByRole('button', { name: 'Add handoff' }).click();
  await page.getByLabel('What’s happening?').fill('School gate pickup');
  await page.getByLabel('Type').selectOption('handoff');
  await page.getByLabel('From').selectOption({ label: 'Alex' });
  await page.getByLabel('To').selectOption({ label: 'Sam' });
  await page.getByRole('button', { name: 'Save to board' }).click();
  await expect(page.getByText('School gate pickup')).toBeVisible();
  await expect(page.getByText('Alex')).toBeVisible();
  await page.reload();
  await expect(page.getByText('School gate pickup')).toBeVisible();
});

test('has no serious or critical accessibility violations', async ({ page }) => {
  await page.evaluate(axe.source);
  const results = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe;
    return engine.run(document);
  });
  expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Add handoff' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('loads the saved shell offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Know who’s next.' })).toBeVisible();
  await expect(page.getByText(/You’re offline/)).toBeVisible();
});

test('works at a 390px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add handoff' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
});
