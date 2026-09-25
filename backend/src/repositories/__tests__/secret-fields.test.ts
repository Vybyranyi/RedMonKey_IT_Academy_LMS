import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../academy.repository.js';
import { attendanceRepository } from '../attendance.repository.js';
import { coinRepository } from '../coin.repository.js';
import { gradeRepository } from '../grade.repository.js';
import { groupRepository } from '../group.repository.js';
import { lessonRepository } from '../lesson.repository.js';
import { statsRepository } from '../stats.repository.js';
import { userRepository } from '../user.repository.js';

/**
 * Аудит «passwordHash і tokenVersion не витікають назовні» як тест, що ганяється
 * на кожен PR. Проганяємо кожен метод кожного репозиторію проти фейкового Prisma,
 * записуємо аргументи запитів і перевіряємо проєкції:
 *  - секретні поля вибирають лише методи, які потрібні auth.service;
 *  - запит до таблиці users і будь-який зв'язок на User мають явний select —
 *    без нього Prisma повертає всі скаляри, разом із секретами.
 * Новий метод репозиторію потрапить сюди автоматично.
 */

interface PrismaCall {
  model: string;
  method: string;
  args: Record<string, unknown> | undefined;
}

const { calls } = vi.hoisted(() => ({ calls: [] as PrismaCall[] }));

vi.mock('../../lib/prisma.js', () => {
  // Мінімальна форма відповіді, з якою не падає жоден метод (flatten, агрегати)
  const fakeRow = {
    teachers: [],
    students: [],
    _avg: { value: null },
    _sum: { amount: null },
    _count: { _all: 0 },
    redCoins: 0,
    tokenVersion: 0,
  };
  const LIST_METHODS = ['findMany', 'groupBy'];

  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_target, method: string) => (args?: Record<string, unknown>) => {
          calls.push({ model: name, method, args });
          return Promise.resolve(LIST_METHODS.includes(method) ? [] : fakeRow);
        },
      }
    );

  const prisma: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_target, key: string) =>
        key === '$transaction'
          ? (arg: unknown) =>
              typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[])
          : model(key),
    }
  );

  return { prisma };
});

const SECRET_FIELDS = ['passwordHash', 'tokenVersion'];

/** Назви зв'язків, що ведуть на модель User (див. schema.prisma). */
const USER_RELATIONS = ['users', 'students', 'student', 'teacher', 'issuer'];

/** Єдині методи, яким дозволено читати секрети: логін, refresh, зміна пароля. */
const SECRET_READERS = [
  'userRepository.findCredentialsByEmail',
  'userRepository.findCredentialsById',
  'userRepository.updatePassword',
];

/** Методи, яким дефолтні аргументи не підходять (масиви, числа). */
const ARGS: Record<string, unknown[]> = {
  'attendanceRepository.upsertMany': [
    'academy-1',
    'lesson-1',
    [{ studentId: 'student-1', status: 'present', note: '' }],
  ],
  'gradeRepository.upsertMany': [
    'academy-1',
    'lesson-1',
    'teacher-1',
    'classwork',
    [{ studentId: 'student-1', value: 10 }],
  ],
  'groupRepository.create': [{ academyId: 'academy-1', name: 'JS-1' }, ['teacher-1']],
  'groupRepository.update': ['group-1', {}, ['teacher-1']],
  'coinRepository.createWithBalance': [{ studentId: 'student-1', amount: 5 }],
  'coinRepository.findLeaderboard': [{}, 10],
};
const DEFAULT_ARGS = ['id-1', {}];

const repositories: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>> = {
  academyRepository,
  attendanceRepository,
  coinRepository,
  gradeRepository,
  groupRepository,
  lessonRepository,
  statsRepository,
  userRepository,
} as never;

const methodNames = Object.entries(repositories).flatMap(([repoName, repo]) =>
  Object.keys(repo).map((method) => `${repoName}.${method}`)
);

/** Обходить select/include-дерево запиту і збирає все, що може віддати секрети. */
const collectProblems = (node: unknown, path: string[], problems: string[]) => {
  if (!node || typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    const here = [...path, key];
    const parent = path[path.length - 1];
    const inProjection = parent === 'select' || parent === 'include';

    if (inProjection && SECRET_FIELDS.includes(key) && value === true) {
      problems.push(`${here.join('.')}: вибирає секретне поле`);
    }
    if (inProjection && USER_RELATIONS.includes(key)) {
      const hasSelect = typeof value === 'object' && value !== null && 'select' in value;
      if (!hasSelect) problems.push(`${here.join('.')}: зв'язок на User без явного select`);
    }

    collectProblems(value, here, problems);
  }
};

const inspect = async (name: string) => {
  const [repoName, method] = name.split('.') as [string, string];
  calls.length = 0;

  await repositories[repoName]![method]!(...(ARGS[name] ?? DEFAULT_ARGS));

  const problems: string[] = [];
  for (const call of calls) {
    const label = `prisma.${call.model}.${call.method}`;
    // Записи в users без select повертають увесь рядок — навіть якщо результат
    // зараз викидається, наступна правка легко почне віддавати його клієнту
    if (call.model === 'user' && !('select' in (call.args ?? {}))) {
      problems.push(`${label}: запит до users без явного select`);
    }
    collectProblems(call.args, [label], problems);
  }
  return problems;
};

beforeEach(() => {
  calls.length = 0;
});

describe('аудит проєкцій: секрети User не виходять за межі auth', () => {
  it.each(methodNames.filter((name) => !SECRET_READERS.includes(name)))(
    '%s не вибирає passwordHash/tokenVersion і не тягне User без select',
    async (name) => {
      expect(await inspect(name)).toEqual([]);
    }
  );

  it.each(SECRET_READERS)('%s — єдиний дозволений читач секретів', async (name) => {
    const problems = await inspect(name);

    // Секрети тут очікувані, а от зв'язки на User без select — ні
    expect(problems.filter((problem) => !problem.endsWith('вибирає секретне поле'))).toEqual([]);
    expect(problems.length).toBeGreaterThan(0);
  });
});
