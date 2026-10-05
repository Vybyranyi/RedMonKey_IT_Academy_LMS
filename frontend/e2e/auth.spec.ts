import { expect, test } from '@playwright/test';
import { mockApi, withSession } from './support/mockApi';

test.describe('вхід і сесія', () => {
  test('вхід веде на головну, а токен не потрапляє в localStorage', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill('admin@academy.com');
    await page.getByLabel('Пароль', { exact: true }).fill('secret-123');
    await page.getByRole('button', { name: 'Увійти' }).click();

    await expect(page.getByRole('heading', { level: 1, name: /Вітаємо, Ірина/ })).toBeVisible();
    const storage = await page.evaluate(() => ({ ...localStorage }));
    expect(storage.hasSession).toBe('1');
    expect(storage.accessToken).toBeUndefined();
    expect(JSON.stringify(storage)).not.toContain('e2e-token');
  });

  test('після перезавантаження сесію відновлює refresh-cookie', async ({ page }) => {
    const api = await mockApi(page);
    await withSession(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /Вітаємо, Ірина/ })).toBeVisible();
    // /auth/me без токена → 401 → refresh → повторний /auth/me
    expect(api.requests).toContain('POST /auth/refresh');
    expect(api.requests.filter((r) => r === 'GET /auth/me').length).toBeGreaterThanOrEqual(2);
  });

  test('відкликаний refresh веде на екран входу', async ({ page }) => {
    await mockApi(page, { refreshRejected: true });
    await withSession(page);
    await page.goto('/students');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Увійти' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('hasSession'))).toBeNull();
  });

  test('вихід очищає прапорець сесії', async ({ page, isMobile }) => {
    await mockApi(page);
    await withSession(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // На телефоні «Вийти» — у меню «Ще»
    if (isMobile) await page.getByRole('button', { name: 'Ще' }).click();
    await page.getByRole('button', { name: 'Вийти' }).first().click();

    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('hasSession'))).toBeNull();
  });
});
