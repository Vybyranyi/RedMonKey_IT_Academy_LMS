import type { Page, Route } from '@playwright/test';

/**
 * Підміна backend для e2e: перехоплює запити фронтенду до API (VITE_API_URL за
 * замовчуванням — http://localhost:3000/api/v1) і віддає фіксовані дані. Форми
 * відповідей — ті самі, що повертає справжній API (див. shared/src/types).
 */
export type Role = 'admin' | 'teacher' | 'student';

const API = '**/api/v1/**';

const at = (dayOffset: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const user = (id: string, role: Role, firstName: string, lastName: string, extra = {}) => ({
  id,
  role,
  firstName,
  lastName,
  email: `${id}@academy.com`,
  redCoins: 20,
  isActive: true,
  ...extra,
});

export const users = {
  admin: user('admin-1', 'admin', 'Ірина', 'Адміненко'),
  teacher: user('teacher-1', 'teacher', 'Олег', 'Петренко'),
  student: user('student-0', 'student', 'Анна', 'Коваленко', { group: { id: 'g1', name: 'JS-1' } }),
};

const NAMES: [string, string][] = [
  ['Анна', 'Коваленко'],
  ['Богдан', 'Мельник'],
  ['Дарина', 'Шевчук'],
  ['Іван', 'Ткаченко'],
  ['Софія', 'Бондаренко'],
  ['Максим', 'Олійник'],
];

const students = NAMES.map(([firstName, lastName], i) => ({
  ...user(`student-${i}`, 'student', firstName, lastName, { group: { id: 'g1', name: 'JS-1' } }),
  redCoins: 10 * i,
  stats: { averageGrade: i === 5 ? null : 6 + i, attendanceRate: i === 3 ? 42 : 90 },
}));

const groups = [
  {
    id: 'g1',
    name: 'JS-1',
    description: 'Frontend: HTML, CSS, JavaScript та React для початківців',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2027-06-30T00:00:00.000Z',
    isActive: true,
    teachers: [users.teacher],
    students,
  },
  {
    id: 'g2',
    name: 'Python-2',
    description: 'Backend',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2027-06-30T00:00:00.000Z',
    isActive: true,
    teachers: [users.teacher],
    students: [],
  },
];

const lesson = (id: string, title: string, dayOffset: number, hour: number) => ({
  id,
  title,
  date: at(dayOffset, hour),
  duration: 80,
  type: 'lecture',
  status: 'scheduled',
  groupId: 'g1',
  teacherId: 'teacher-1',
  group: { id: 'g1', name: 'JS-1' },
  teacher: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
});

const lessons = [
  lesson('l1', 'Вступ до React', 0, 23),
  lesson('l2', 'Хуки: useState і useEffect', 1, 18),
  lesson('l3', 'Робота з API', 2, 19),
];

const grade = (id: string, studentIdx: number, value: number) => ({
  id,
  studentId: `student-${studentIdx}`,
  lessonId: 'l1',
  teacherId: 'teacher-1',
  value,
  type: 'classwork',
  comment: '',
  createdAt: at(0, 10),
  updatedAt: at(0, 10),
  student: {
    id: `student-${studentIdx}`,
    firstName: NAMES[studentIdx][0],
    lastName: NAMES[studentIdx][1],
  },
  lesson: { id: 'l1', title: 'Вступ до React', date: at(0, 23) },
  teacher: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
});

const grades = [grade('gr1', 0, 11), grade('gr2', 1, 8), grade('gr3', 2, 5), grade('gr4', 3, 2)];

const leaderboard = students.map((s, i) => ({
  position: i + 1,
  studentId: s.id,
  firstName: s.firstName,
  lastName: s.lastName,
  groupName: 'JS-1',
  redCoins: 60 - i * 10,
}));

const stats = {
  grades: { average: 9, count: 4 },
  coins: { balance: 50, earned: 60, spent: 10 },
  attendance: { total: 10, present: 9, absent: 1, late: 0, excused: 0, rate: 90 },
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': 'http://localhost:4173',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE',
    },
    body: JSON.stringify(body),
  });

export interface MockOptions {
  role?: Role;
  /** refresh-cookie відкликано: POST /auth/refresh → 401 */
  refreshRejected?: boolean;
}

/** Запити, які фронтенд зробив до підміненого API — для перевірок у тестах. */
export interface MockApi {
  requests: string[];
}

export async function mockApi(
  page: Page,
  { role = 'admin', refreshRejected = false }: MockOptions = {}
) {
  const me = users[role];
  const requests: string[] = [];

  await page.route(API, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    requests.push(`${request.method()} ${path}`);

    if (request.method() === 'OPTIONS') return json(route, {}, 204);
    if (path === '/auth/refresh') {
      return refreshRejected
        ? json(route, { message: 'Сесію відкликано' }, 401)
        : json(route, { accessToken: 'e2e-token' });
    }
    if (path === '/auth/login') return json(route, { user: me, accessToken: 'e2e-token' });
    if (path === '/auth/logout') return json(route, { message: 'ok' });
    if (!request.headers()['authorization'])
      return json(route, { message: 'Потрібна авторизація' }, 401);

    if (path === '/auth/me') return json(route, me);
    if (path === '/users') {
      const wanted = url.searchParams.get('role');
      return json(route, wanted === 'teacher' ? [users.teacher] : students);
    }
    if (/^\/users\/[^/]+\/stats$/.test(path)) return json(route, stats);
    if (path === '/groups') return json(route, groups);
    if (path === '/lessons') return json(route, lessons);
    if (path === '/grades') return json(route, grades);
    if (path === '/attendance') return json(route, []);
    if (path === '/coins/leaderboard') return json(route, leaderboard);
    if (path === '/coins/transactions') return json(route, { items: [], nextCursor: null });
    if (path.startsWith('/coins/students/')) {
      return json(route, { studentId: 'student-0', balance: 50, earned: 60, spent: 10 });
    }
    return json(route, { message: `e2e-мок: невідомий маршрут ${request.method()} ${path}` }, 404);
  });

  const api: MockApi = { requests };
  return api;
}

/** Стан після попереднього входу: прапорець сесії є, токена в пам'яті — ще ні. */
export const withSession = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('hasSession', '1'));
