import { expect, test } from '@playwright/test';
import { mockApi, withSession } from './support/mockApi';

// 1×1 PNG — справжній файл зображення, як з діалогу вибору
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('профіль — аватарка', () => {
  test('студент завантажує фото, і воно з’являється в шапці профілю', async ({ page }) => {
    const api = await mockApi(page, { role: 'student' });
    await withSession(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: 'Мій профіль' })).toBeVisible();

    await page.getByRole('button', { name: 'Редагувати профіль' }).click();
    const dialog = page.getByRole('dialog', { name: 'Редагування профілю' });
    await dialog.getByTestId('avatar-input').setInputFiles({
      name: 'me.png',
      mimeType: 'image/png',
      buffer: PNG,
    });

    await expect(page.getByText('Фото оновлено')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Видалити фото/ })).toBeVisible();
    expect(api.requests.some((request) => /^PUT \/users\/[^/]+\/avatar$/.test(request))).toBe(true);

    await page.keyboard.press('Escape');
    // Radix показує <img> лише після того, як картинка справді завантажилась
    await expect(page.locator('main img[src^="data:image/gif"]')).toBeVisible();
  });
});
