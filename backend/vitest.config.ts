import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    // Тестові секрети — не реальні креденшли, лише щоб config/env.ts не впав при старті.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_ACCESS_SECRET: "test-access-secret-min-32-characters-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-min-32-characters-long",
      CLIENT_URL: "http://localhost:5173",
    },
  },
});
