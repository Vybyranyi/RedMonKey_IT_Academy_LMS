import bcrypt from 'bcryptjs';
import request from 'supertest';
import { UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { userRepository } from '../repositories/user.repository.js';

// Окремий файл, бо лічильники rate-limit живуть у пам'яті модуля: Vitest дає кожному
// файлу свіжий app, тож вичерпаний тут ліміт не зачепить api.test.ts.
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../repositories/user.repository.js', () => ({
  userRepository: { findCredentialsByEmail: vi.fn() },
  toPublicUser: (user: Record<string, unknown>) => {
    const { passwordHash, tokenVersion, ...publicUser } = user;
    return publicUser;
  },
}));

const findCredentialsByEmail = vi.mocked(userRepository.findCredentialsByEmail);

const LOGIN_FAILURES_ALLOWED = 10;
const REFRESH_REQUESTS_ALLOWED = 60;

const login = (password: string) =>
  request(app).post('/api/v1/auth/login').send({ email: 'teacher@academy.com', password });

beforeEach(async () => {
  findCredentialsByEmail.mockResolvedValue({
    id: 'teacher-1',
    email: 'teacher@academy.com',
    role: UserRole.TEACHER,
    isActive: true,
    passwordHash: await bcrypt.hash('secret123', 4),
    tokenVersion: 0,
  } as never);
});

// Тести в describe спираються на спільний лічильник і йдуть строго по черзі
describe('POST /api/v1/auth/login — ліміт невдалих спроб', () => {
  it('успішні входи ліміт не витрачають', async () => {
    for (let i = 0; i < LOGIN_FAILURES_ALLOWED + 5; i++) {
      const response = await login('secret123');
      expect(response.status).toBe(200);
    }
  });

  it(`після ${LOGIN_FAILURES_ALLOWED} невдалих спроб відповідає 429`, async () => {
    for (let i = 0; i < LOGIN_FAILURES_ALLOWED; i++) {
      const response = await login('wrong');
      expect(response.status).toBe(401);
    }

    const blocked = await login('wrong');

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe('Забагато невдалих спроб входу. Спробуйте через 15 хвилин');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  // Заблокований клієнт не може «вгадати» пароль навіть правильним: запит не доходить до bcrypt
  it('блокує і правильний пароль до кінця вікна', async () => {
    findCredentialsByEmail.mockClear();

    const response = await login('secret123');

    expect(response.status).toBe(429);
    expect(findCredentialsByEmail).not.toHaveBeenCalled();
  });
});

describe('загальний ліміт /api/v1', () => {
  it('рахує звичайні запити й віддає заголовки RateLimit', async () => {
    const response = await request(app).get('/api/v1/users');

    expect(response.headers['ratelimit-policy']).toContain('1000');
  });

  // Health-check хостингу б'є часто — він не має витрачати ліміт і отримувати 429
  it('не рахує health-check', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['ratelimit-policy']).toBeUndefined();
  });
});

describe('POST /api/v1/auth/refresh — окремий ліміт', () => {
  it(`після ${REFRESH_REQUESTS_ALLOWED} запитів відповідає 429`, async () => {
    for (let i = 0; i < REFRESH_REQUESTS_ALLOWED; i++) {
      const response = await request(app).post('/api/v1/auth/refresh');
      expect(response.status).toBe(401);
    }

    const blocked = await request(app).post('/api/v1/auth/refresh');

    expect(blocked.status).toBe(429);
  });

  it('вичерпаний ліміт auth не блокує решту API', async () => {
    const response = await request(app).get('/api/v1/users');

    // 401 від authenticate, а не 429: загальний ліміт рахується окремо
    expect(response.status).toBe(401);
  });
});
