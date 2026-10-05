import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * E2E на справжньому браузері й справжній збірці (vite preview), але з підміненим
 * API (e2e/support/mockApi.ts): без БД і backend сценарії детерміновані й однаково
 * працюють локально та в CI. Локально — встановлений Chrome (без завантаження
 * браузера); у CI — chromium, який ставить `npx playwright install`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    // Збірку робить `npm run test:e2e` (або крок CI) — тут лише віддаємо dist
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
