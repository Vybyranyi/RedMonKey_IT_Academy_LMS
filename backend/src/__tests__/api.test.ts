import bcrypt from 'bcryptjs';
import request from 'supertest';
import { CoinCategory, UserRole } from '@redmonkey/shared';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { coinRepository } from '../repositories/coin.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { generateAccessToken } from '../utils/jwt.js';

// Жоден API-тест не ходить у справжню БД: підміняємо найглибший шар —
// репозиторії, — а маршрути, middleware, контролери й сервіси працюють справжні.
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../repositories/academy.repository.js', () => ({
  academyRepository: { getDefaultId: vi.fn() },
}));
vi.mock('../repositories/coin.repository.js', () => ({
  coinRepository: {
    findAll: vi.fn(),
    createWithBalance: vi.fn(),
    findLeaderboard: vi.fn(),
    sumByDirection: vi.fn(),
  },
}));
vi.mock('../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));
vi.mock('../repositories/user.repository.js', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIdActive: vi.fn(),
    findByEmail: vi.fn(),
    incrementTokenVersion: vi.fn(),
  },
  toPublicUser: (user: Record<string, unknown>) => {
    const { passwordHash, tokenVersion, ...publicUser } = user;
    return publicUser;
  },
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const createWithBalance = vi.mocked(coinRepository.createWithBalance);
const sumByDirection = vi.mocked(coinRepository.sumByDirection);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const userFindAll = vi.mocked(userRepository.findAll);
const userFindById = vi.mocked(userRepository.findById);
const findByEmail = vi.mocked(userRepository.findByEmail);

const OWN_GROUP = 'group-own';
const STUDENT_ID = '11111111-1111-4111-8111-111111111111';

const adminToken = generateAccessToken({ userId: 'admin-1', role: UserRole.ADMIN });
const teacherToken = generateAccessToken({ userId: 'teacher-1', role: UserRole.TEACHER });
const studentToken = generateAccessToken({ userId: 'student-1', role: UserRole.STUDENT });

const validTransaction = {
  studentId: STUDENT_ID,
  amount: 50,
  reason: 'Активність на занятті',
  category: CoinCategory.ACTIVITY,
};

const activeStudent = {
  id: STUDENT_ID,
  role: UserRole.STUDENT,
  isActive: true,
  groupId: OWN_GROUP,
  redCoins: 100,
};

let passwordHash: string;

beforeAll(async () => {
  // Невисокий cost — тест перевіряє логіку входу, а не стійкість хеша
  passwordHash = await bcrypt.hash('secret123', 4);
});

beforeEach(() => {
  vi.clearAllMocks();
  getDefaultId.mockResolvedValue('academy-1');
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  userFindAll.mockResolvedValue([] as never);
  userFindById.mockResolvedValue(activeStudent as never);
  createWithBalance.mockResolvedValue({ id: 'tx-1' } as never);
});

describe('GET /api/v1/health', () => {
  it('відповідає без авторизації', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

describe('автентифікація маршрутів', () => {
  it('без токена повертає 401', async () => {
    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Користувач не авторизований (відсутній токен)');
  });

  it('з підробленим токеном повертає 401', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Недійсний або прострочений токен доступу');
  });

  it('без префікса Bearer повертає 401', async () => {
    const response = await request(app).get('/api/v1/users').set('Authorization', adminToken);

    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/users', () => {
  it('студенту віддає 403 — список користувачів закритий для нього', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('У вас немає доступу до цієї операції');
  });

  // Викладач бачить лише студентів — обмеження перекриває фільтр role із query
  it('викладачу звужує вибірку до студентів попри фільтр у запиті', async () => {
    const response = await request(app)
      .get('/api/v1/users?role=admin')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(userFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.STUDENT, isActive: true })
    );
  });

  it('адміну віддає список без звуження за роллю', async () => {
    await request(app).get('/api/v1/users').set('Authorization', `Bearer ${adminToken}`);

    expect(userFindAll).toHaveBeenCalledWith({ isActive: true });
  });
});

describe('POST /api/v1/coins/transactions', () => {
  it('студенту віддає 403 — нараховувати монети він не може', async () => {
    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(validTransaction);

    expect(response.status).toBe(403);
  });

  // Zod-помилка має доходити як 400 з текстом, а не як 500 від Prisma
  it('нульову суму відхиляє з 400 і поясненням', async () => {
    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ ...validTransaction, amount: 0 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Кількість монет не може дорівнювати нулю');
  });

  it('некоректний studentId відхиляє з 400', async () => {
    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ ...validTransaction, studentId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('studentId має бути UUID');
  });

  it('студента чужої групи відхиляє з 403', async () => {
    userFindById.mockResolvedValue({ ...activeStudent, groupId: 'group-other' } as never);

    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(validTransaction);

    expect(response.status).toBe(403);
  });

  it('списання нижче нуля відхиляє з 400', async () => {
    createWithBalance.mockResolvedValue(null as never);

    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ ...validTransaction, amount: -500, category: CoinCategory.PENALTY });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Недостатньо монет');
  });

  it('коректне нарахування повертає 201', async () => {
    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(validTransaction);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'tx-1' });
  });
});

describe('обробка несподіваних помилок', () => {
  // Текст внутрішньої помилки не має витікати клієнту
  it('падіння репозиторію віддає 500 без деталей', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sumByDirection.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'));

    const response = await request(app)
      .get(`/api/v1/coins/students/${STUDENT_ID}/balance`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Помилка при отриманні балансу');
    expect(JSON.stringify(response.body)).not.toContain('ECONNREFUSED');
  });
});

describe('POST /api/v1/auth/login', () => {
  const dbUser = () => ({
    id: 'teacher-1',
    email: 'teacher@academy.com',
    role: UserRole.TEACHER,
    isActive: true,
    passwordHash,
    tokenVersion: 1,
  });

  it('невірний пароль повертає 401', async () => {
    findByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Невірний email або пароль');
  });

  it('успішний вхід повертає access-токен і профіль', async () => {
    findByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.user).toMatchObject({ id: 'teacher-1', role: UserRole.TEACHER });
  });

  it('не віддає хеш пароля у відповіді', async () => {
    findByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
  });

  // Refresh живе лише в httpOnly-куці — інакше його дістав би будь-який скрипт на сторінці
  it('кладе refresh-токен у httpOnly-куку, а не в тіло відповіді', async () => {
    findByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('refreshToken=');
    expect(cookies.join(';')).toContain('HttpOnly');
    expect(response.body).not.toHaveProperty('refreshToken');
  });
});
