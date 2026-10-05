import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockApi, withSession, type Role } from './support/mockApi';

/**
 * Автоматична перевірка доступності у справжньому браузері зі справжніми стилями:
 * на відміну від vitest-axe (jsdom), тут рахується КОНТРАСТ кольорів. Пороги — WCAG 2.1 AA.
 */
const PAGES: { path: string; heading: string | RegExp; role?: Role }[] = [
  { path: '/', heading: /Вітаємо/ },
  { path: '/students', heading: 'Студенти' },
  { path: '/teachers', heading: 'Викладачі' },
  { path: '/groups', heading: 'Групи' },
  { path: '/schedule', heading: 'Розклад занять' },
  { path: '/grades', heading: 'Журнал оцінок' },
  { path: '/coins', heading: 'RedCoins' },
  { path: '/profile', heading: 'Мій профіль' },
  { path: '/', heading: /Вітаємо/, role: 'student' },
  { path: '/grades', heading: 'Журнал оцінок', role: 'student' },
];

const describeViolations = (violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) =>
  violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    nodes: v.nodes
      .slice(0, 5)
      .map((n) => `${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`),
  }));

/**
 * react-big-calendar сам віддає role="columnheader" без батьківського row та рядки без
 * комірок — це розмітка бібліотеки, не наша. Контраст календаря перевіряється повністю
 * (тест вище); тут виключені лише ці два структурні правила й лише для /schedule.
 */
const isKnownThirdPartyIssue = (rule: string, path: string) =>
  rule === 'color-contrast' ||
  (path === '/schedule' && ['aria-required-children', 'aria-required-parent'].includes(rule));

const scan = async (page: Page, rules?: string[]) => {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (rules) builder.options({ runOnly: rules });
  // Дочекатись, поки пройдуть переходи й анімації появи, інакше axe рахує проміжні кольори
  await page.waitForTimeout(400);
  return builder.analyze();
};

test.describe('a11y: контраст кольорів на всіх сторінках', () => {
  for (const { path, heading, role = 'admin' } of PAGES) {
    test(`${role} ${path}`, async ({ page }) => {
      await mockApi(page, { role });
      await withSession(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      // Скелетони й тости не мають бути на екрані під час виміру
      await expect(page.locator('[data-slot=skeleton]')).toHaveCount(0);

      const { violations } = await scan(page, ['color-contrast']);

      expect(describeViolations(violations)).toEqual([]);
    });
  }

  test('вхід', async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Увійти' })).toBeVisible();

    const { violations } = await scan(page, ['color-contrast']);

    expect(describeViolations(violations)).toEqual([]);
  });
});

test.describe('a11y: решта правил WCAG 2.1 AA', () => {
  for (const { path, heading, role = 'admin' } of PAGES) {
    test(`${role} ${path}`, async ({ page }) => {
      await mockApi(page, { role });
      await withSession(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('[data-slot=skeleton]')).toHaveCount(0);

      const { violations } = await scan(page);

      expect(
        describeViolations(violations.filter((v) => !isKnownThirdPartyIssue(v.id, path)))
      ).toEqual([]);
    });
  }
});
