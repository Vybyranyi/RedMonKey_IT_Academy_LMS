/**
 * config/env.ts валідує оточення прямо на імпорті й кидає помилку без секретів,
 * тож їх треба виставити до того, як тест підтягне будь-який модуль бекенда.
 * Значення фіктивні: жоден тест не ходить у справжню БД.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef-0123456789';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = process.env.DATABASE_URL;
