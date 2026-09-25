import { Prisma } from '@prisma/client';
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
    findPage: vi.fn(),
    createWithBalance: vi.fn(),
    findLeaderboard: vi.fn(),
    sumByDirection: vi.fn(),
  },
}));
vi.mock('../repositories/group.repository.js', () => ({
  groupRepository: {
    findIdsByTeacher: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../repositories/user.repository.js', () => ({
  userRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIdActive: vi.fn(),
    findCredentialsByEmail: vi.fn(),
    findCredentialsById: vi.fn(),
    existsByEmail: vi.fn(),
    findStudentIdsByGroups: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
const findPage = vi.mocked(coinRepository.findPage);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const groupFindByName = vi.mocked(groupRepository.findByName);
const groupCreate = vi.mocked(groupRepository.create);
const groupUpdate = vi.mocked(groupRepository.update);
const userFindAll = vi.mocked(userRepository.findAll);
const userFindById = vi.mocked(userRepository.findById);
const userCreate = vi.mocked(userRepository.create);
const userUpdate = vi.mocked(userRepository.update);
const existsByEmail = vi.mocked(userRepository.existsByEmail);
const findCredentialsByEmail = vi.mocked(userRepository.findCredentialsByEmail);

const OWN_GROUP = 'group-own';
const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '44444444-4444-4444-8444-444444444444';
const TEACHER_ID = '55555555-5555-4555-8555-555555555555';

/** Помилка обмеження БД так, як її кидає Prisma Client. */
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('constraint failed', { code, clientVersion: 'test' });

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
  existsByEmail.mockResolvedValue(false);
  userCreate.mockResolvedValue({ id: STUDENT_ID } as never);
  userUpdate.mockResolvedValue({ id: STUDENT_ID } as never);
  groupFindByName.mockResolvedValue(null as never);
  groupCreate.mockResolvedValue({ id: GROUP_ID } as never);
  groupUpdate.mockResolvedValue({ id: GROUP_ID } as never);
});

describe('GET /api/v1/health', () => {
  it('відповідає без авторизації', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

describe('заголовки безпеки (helmet)', () => {
  it('вмикає захисні заголовки й ховає X-Powered-By', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('невідомі маршрути', () => {
  it('віддають 404 у JSON, а не HTML-сторінку Express', async () => {
    const response = await request(app).get('/api/v1/no-such-route');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.message).toBe('Маршрут GET /api/v1/no-such-route не знайдено');
  });

  it('обробляють і шляхи поза /api/v1', async () => {
    const response = await request(app).post('/whatever');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Маршрут POST /whatever не знайдено');
  });
});

describe('розбір тіла запиту', () => {
  it('битий JSON віддає 400 з поясненням, а не 500', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "admin@academy.com",');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Тіло запиту містить некоректний JSON');
  });

  it('тіло понад 1 МБ відхиляє з 413 ще до контролера', async () => {
    const response = await request(app)
      .post('/api/v1/coins/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validTransaction, reason: 'x'.repeat(1024 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.message).toBe('Тіло запиту завелике (максимум 1mb)');
    expect(createWithBalance).not.toHaveBeenCalled();
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

  // Раніше query йшов у Prisma як є: колонка uuid на «js-1» відповідала 500
  it('на groupId, що не є UUID, відповідає 400 і не йде в БД', async () => {
    const response = await request(app)
      .get('/api/v1/users?groupId=js-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('groupId має бути UUID');
    expect(userFindAll).not.toHaveBeenCalled();
  });

  // Так StudentsPage питає список, коли фільтри порожні
  it('порожні groupId і q не звужують вибірку', async () => {
    const response = await request(app)
      .get('/api/v1/users?role=student&groupId=&q=')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(userFindAll).toHaveBeenCalledWith({ isActive: true, role: UserRole.STUDENT });
  });

  it('передає в БД обрізаний пошуковий запит і групу', async () => {
    await request(app)
      .get(`/api/v1/users?groupId=${GROUP_ID}&q=%20Коваль%20`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(userFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: GROUP_ID,
        OR: expect.arrayContaining([{ lastName: { contains: 'Коваль', mode: 'insensitive' } }]),
      })
    );
  });
});

describe('GET /api/v1/attendance', () => {
  it('на lessonId, що не є UUID, відповідає 400, а не 500', async () => {
    const response = await request(app)
      .get('/api/v1/attendance?lessonId=lesson-1')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('lessonId має бути UUID');
  });
});

// Mass assignment: раніше тіло PATCH /users/:id ішло в Prisma як є, і адмін
// (або викрадений адмінський токен) міг переписати баланс чи tokenVersion
describe('PATCH /api/v1/users/:id — білий список полів', () => {
  const patchUser = (body: object) =>
    request(app)
      .patch(`/api/v1/users/${STUDENT_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  it('не передає в БД redCoins, tokenVersion і passwordHash', async () => {
    const response = await patchUser({
      firstName: 'Анна',
      redCoins: 999_999,
      tokenVersion: 0,
      passwordHash: '$2a$10$fake',
      academyId: 'academy-evil',
    });

    expect(response.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(STUDENT_ID, { firstName: 'Анна' });
  });

  it('тіло лише із забороненими полями відхиляє з 400', async () => {
    const response = await patchUser({ redCoins: 999_999, tokenVersion: 0 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Не передано жодного поля для оновлення');
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('невалідний тип поля відхиляє з 400, а не 500 від Prisma', async () => {
    const response = await patchUser({ firstName: 123 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Імʼя: очікується рядок');
  });

  it('пароль хешує, а не пише як є', async () => {
    await patchUser({ password: 'newSecret1' });

    const [, data] = userUpdate.mock.calls[0] as [string, Record<string, unknown>];
    expect(data).not.toHaveProperty('password');
    expect(await bcrypt.compare('newSecret1', data.passwordHash as string)).toBe(true);
  });

  it('зайнятий email віддає 400 замість 500', async () => {
    userUpdate.mockRejectedValue(prismaError('P2002'));

    const response = await patchUser({ email: 'taken@academy.com' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Користувач з таким email вже існує');
  });
});

describe('POST /api/v1/users', () => {
  const newStudent = {
    firstName: 'Іван',
    lastName: 'Петренко',
    email: 'ivan@academy.com',
    role: UserRole.STUDENT,
    password: 'secret123',
    group: GROUP_ID,
  };

  it('ігнорує баланс і службові поля з тіла', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...newStudent,
        redCoins: 1000,
        tokenVersion: 7,
        passwordHash: 'plain',
        academyId: 'x',
      });

    expect(response.status).toBe(201);
    const [data] = userCreate.mock.calls[0] as [Record<string, unknown>];
    expect(data).toMatchObject({ academyId: 'academy-1', redCoins: 0, groupId: GROUP_ID });
    expect(data).not.toHaveProperty('tokenVersion');
    expect(data.passwordHash).not.toBe('plain');
  });

  it('невалідний email відхиляє з 400', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newStudent, email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Некоректний email');
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('неіснуючу групу відхиляє з 400', async () => {
    userCreate.mockRejectedValue(prismaError('P2003'));

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStudent);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Вказаної групи не існує');
  });
});

describe('POST /api/v1/groups', () => {
  const postGroup = (body: object) =>
    request(app).post('/api/v1/groups').set('Authorization', `Bearer ${adminToken}`).send(body);

  // Саме це тіло шле GroupForm; раніше '' в датах падав у Prisma з 500
  it('приймає тіло з форми з порожніми датами', async () => {
    const response = await postGroup({
      name: 'JS-2026-A',
      description: '',
      startDate: '',
      endDate: '',
      teachers: [],
      students: [],
      academyId: 'academy-evil',
    });

    expect(response.status).toBe(201);
    expect(groupCreate).toHaveBeenCalledWith(
      {
        name: 'JS-2026-A',
        description: '',
        startDate: null,
        endDate: null,
        academyId: 'academy-1',
      },
      []
    );
  });

  it('не дає призначити викладачем того, хто не є активним викладачем', async () => {
    userFindAll.mockResolvedValue([] as never);

    const response = await postGroup({ name: 'JS-2026-A', teachers: [TEACHER_ID] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Серед teachers є id, які не належать активним викладачам');
    expect(userFindAll).toHaveBeenCalledWith({
      id: { in: [TEACHER_ID] },
      role: UserRole.TEACHER,
      isActive: true,
    });
    expect(groupCreate).not.toHaveBeenCalled();
  });

  it('відхиляє дату завершення раніше за дату початку', async () => {
    const response = await postGroup({
      name: 'JS-2026-A',
      startDate: '2026-09-01',
      endDate: '2026-06-01',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Дата завершення має бути пізніше за дату початку');
  });
});

describe('PATCH /api/v1/groups/:id', () => {
  const patchGroup = (body: object) =>
    request(app)
      .patch(`/api/v1/groups/${GROUP_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  it('не передає в БД поля поза білим списком', async () => {
    const response = await patchGroup({
      description: 'Новий опис',
      isActive: false,
      academyId: 'x',
    });

    expect(response.status).toBe(200);
    expect(groupUpdate).toHaveBeenCalledWith(GROUP_ID, { description: 'Новий опис' }, undefined);
  });

  it('зайняту назву відхиляє з 400', async () => {
    groupUpdate.mockRejectedValue(prismaError('P2002'));

    const response = await patchGroup({ name: 'JS-2026-B' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Група з такою назвою вже існує');
  });
});

describe('GET /api/v1/coins/transactions', () => {
  const getHistory = (query = '') =>
    request(app)
      .get(`/api/v1/coins/transactions${query}`)
      .set('Authorization', `Bearer ${adminToken}`);

  it('віддає сторінку { items, nextCursor } з limit за замовчуванням', async () => {
    findPage.mockResolvedValue({ items: [{ id: 'tx-1' }], nextCursor: 'tx-1' } as never);

    const response = await getHistory();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ id: 'tx-1' }], nextCursor: 'tx-1' });
    expect(findPage).toHaveBeenCalledWith({}, 20, undefined);
  });

  it('передає limit і cursor із query-рядка', async () => {
    findPage.mockResolvedValue({ items: [], nextCursor: null } as never);

    await getHistory(`?limit=50&cursor=${STUDENT_ID}`);

    expect(findPage).toHaveBeenCalledWith({}, 50, STUDENT_ID);
  });

  // Без верхньої межі limit=100000 знову віддав би весь ledger одним запитом
  it('limit понад 100 відхиляє з 400', async () => {
    const response = await getHistory('?limit=101');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('limit не може бути більшим за 100');
    expect(findPage).not.toHaveBeenCalled();
  });

  it('невідомий курсор відхиляє з 400', async () => {
    findPage.mockResolvedValue(null as never);

    const response = await getHistory(`?cursor=${STUDENT_ID}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Некоректний курсор пагінації');
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

  // Без email Prisma отримала б where: { email: undefined } — тобто першого-ліпшого користувача
  it('запит без email відхиляє з 400, не звертаючись до БД', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ password: 'secret123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Потрібно вказати email');
    expect(findCredentialsByEmail).not.toHaveBeenCalled();
  });

  it('невірний пароль повертає 401', async () => {
    findCredentialsByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Невірний email або пароль');
  });

  it('успішний вхід повертає access-токен і профіль', async () => {
    findCredentialsByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTypeOf('string');
    expect(response.body.user).toMatchObject({ id: 'teacher-1', role: UserRole.TEACHER });
  });

  it('не віддає хеш пароля у відповіді', async () => {
    findCredentialsByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
  });

  // Refresh живе лише в httpOnly-куці — інакше його дістав би будь-який скрипт на сторінці
  it('кладе refresh-токен у httpOnly-куку, а не в тіло відповіді', async () => {
    findCredentialsByEmail.mockResolvedValue(dbUser() as never);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@academy.com', password: 'secret123' });

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('refreshToken=');
    expect(cookies.join(';')).toContain('HttpOnly');
    expect(response.body).not.toHaveProperty('refreshToken');
  });
});
