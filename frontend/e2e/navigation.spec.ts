import { expect, test } from '@playwright/test';
import { mockApi, withSession } from './support/mockApi';

test.describe('навігація й клавіатура', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await withSession(page);
  });

  test('перший Tab дає «Перейти до змісту», Enter фокусує main без #hash', async ({ page }) => {
    await page.goto('/students');
    await expect(page.getByRole('heading', { level: 1, name: 'Студенти' })).toBeVisible();

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Перейти до змісту' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
    expect(new URL(page.url()).hash).toBe('');
  });

  test('після переходу за меню фокус стає на заголовку нового розділу', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Вітаємо/ })).toBeVisible();

    if (isMobile) {
      await page
        .getByRole('navigation', { name: 'Основна навігація' })
        .getByRole('link', { name: 'Розклад' })
        .click();
    } else {
      await page
        .getByRole('navigation', { name: 'Бічне меню' })
        .getByRole('link', { name: 'Розклад' })
        .click();
    }

    const heading = page.getByRole('heading', { level: 1, name: 'Розклад занять' });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page).toHaveTitle('Розклад занять · IT Academy LMS');
  });

  test('невідомий маршрут і /settings — 404 усередині layout', async ({ page }) => {
    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })
    ).toBeVisible();
  });

  test('сторінки довантажуються окремими чанками, а не одним бандлом', async ({ page }) => {
    const scripts = new Set<string>();
    page.on('response', (response) => {
      if (response.url().endsWith('.js'))
        scripts.add(new URL(response.url()).pathname.split('/').pop()!);
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect([...scripts].some((name) => name.startsWith('SchedulePage'))).toBe(false);

    await page.goto('/schedule');
    // Заголовок рисує layout ще до того, як довантажиться чанк сторінки — чекаємо саме чанк
    await expect
      .poll(() => [...scripts].some((name) => name.startsWith('SchedulePage')))
      .toBe(true);
  });
});

test.describe('дашборд адміна', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await withSession(page);
  });

  test('підписи карток статистики не обрізані, кнопки швидких дій не вилазять за рамку', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Вітаємо/ })).toBeVisible();

    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main p, main a, main span')]
        .filter((el) => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1)
        .filter((el) => getComputedStyle(el).overflow !== 'visible')
        .map((el) => el.textContent?.trim())
    );
    expect(clipped).toEqual([]);

    const noPageScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    );
    expect(noPageScroll).toBe(true);
  });
});
