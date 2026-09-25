import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import { CoinCategory } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../../repositories/academy.repository.js';
import { coinRepository } from '../../repositories/coin.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { coinService } from '../coin.service.js';

vi.mock('../../repositories/academy.repository.js', () => ({
  academyRepository: { getDefaultId: vi.fn() },
}));
vi.mock('../../repositories/coin.repository.js', () => ({
  coinRepository: {
    findPage: vi.fn(),
    createWithBalance: vi.fn(),
    findLeaderboard: vi.fn(),
    sumByDirection: vi.fn(),
  },
}));
vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findById: vi.fn(), findStudentIdsByGroups: vi.fn() },
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const findPage = vi.mocked(coinRepository.findPage);
const createWithBalance = vi.mocked(coinRepository.createWithBalance);
const findLeaderboard = vi.mocked(coinRepository.findLeaderboard);
const sumByDirection = vi.mocked(coinRepository.sumByDirection);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const findById = vi.mocked(userRepository.findById);
const findStudentIdsByGroups = vi.mocked(userRepository.findStudentIdsByGroups);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const OTHER_GROUP = 'group-other';

const activeStudent = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'student-1',
    role: UserRole.STUDENT,
    isActive: true,
    groupId: OWN_GROUP,
    redCoins: 100,
    ...overrides,
  }) as never;

const payload = {
  studentId: 'student-1',
  amount: 50,
  reason: 'Активність на занятті',
  category: CoinCategory.ACTIVITY,
};

beforeEach(() => {
  vi.clearAllMocks();
  getDefaultId.mockResolvedValue('academy-1');
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  findPage.mockResolvedValue({ items: [], nextCursor: null } as never);
  createWithBalance.mockResolvedValue({ id: 'tx-1' } as never);
});

describe('getTransactions', () => {
  const GROUP_STUDENTS = ['student-1', 'student-2'];
  const page = { limit: 20 };

  beforeEach(() => {
    findStudentIdsByGroups.mockResolvedValue(GROUP_STUDENTS);
  });

  it('адмін без фільтрів отримує першу сторінку всієї академії', async () => {
    await coinService.getTransactions(page, admin);

    expect(findPage).toHaveBeenCalledWith({}, 20, undefined);
  });

  it('передає limit і cursor у репозиторій', async () => {
    await coinService.getTransactions({ limit: 50, cursor: 'tx-40' }, admin);

    expect(findPage).toHaveBeenCalledWith({}, 50, 'tx-40');
  });

  // Групу фільтруємо id студентів — так запит іде індексом (student_id, created_at)
  it('фільтр групи перетворює на список її студентів', async () => {
    await coinService.getTransactions({ ...page, groupId: OWN_GROUP }, admin);

    expect(findStudentIdsByGroups).toHaveBeenCalledWith([OWN_GROUP]);
    expect(findPage).toHaveBeenCalledWith({ studentId: { in: GROUP_STUDENTS } }, 20, undefined);
  });

  it('поєднує studentId із групою, а не підміняє один іншим', async () => {
    await coinService.getTransactions(
      { ...page, groupId: OWN_GROUP, studentId: 'student-9' },
      admin
    );

    expect(findPage).toHaveBeenCalledWith(
      { studentId: { equals: 'student-9', in: GROUP_STUDENTS } },
      20,
      undefined
    );
  });

  // Звуження за роллю має перекривати будь-який фільтр із query — інакше
  // студент прочитав би чужу історію, підставивши чужий studentId
  it('студент бачить лише власні транзакції попри фільтри в запиті', async () => {
    await coinService.getTransactions(
      { ...page, studentId: 'student-9', groupId: OWN_GROUP },
      student
    );

    expect(findStudentIdsByGroups).not.toHaveBeenCalled();
    expect(findPage).toHaveBeenCalledWith({ studentId: student.userId }, 20, undefined);
  });

  it('викладач без фільтра групи бачить студентів усіх своїх груп', async () => {
    await coinService.getTransactions(page, teacher);

    expect(findStudentIdsByGroups).toHaveBeenCalledWith([OWN_GROUP]);
    expect(findPage).toHaveBeenCalledWith({ studentId: { in: GROUP_STUDENTS } }, 20, undefined);
  });

  it('викладач не бачить історію чужої групи', async () => {
    await expect(
      coinService.getTransactions({ ...page, groupId: OTHER_GROUP }, teacher)
    ).rejects.toThrow(ForbiddenError);
    expect(findPage).not.toHaveBeenCalled();
  });

  it('невідомий курсор відхиляє з 400', async () => {
    findPage.mockResolvedValue(null as never);

    await expect(
      coinService.getTransactions({ ...page, cursor: 'missing' }, admin)
    ).rejects.toThrow('Некоректний курсор пагінації');
  });
});

describe('createTransaction', () => {
  it('не знаходить неіснуючого студента', async () => {
    findById.mockResolvedValue(null as never);

    await expect(coinService.createTransaction(payload, admin)).rejects.toThrow(NotFoundError);
  });

  it('не нараховує монети деактивованому студенту', async () => {
    findById.mockResolvedValue(activeStudent({ isActive: false }));

    await expect(coinService.createTransaction(payload, admin)).rejects.toThrow(NotFoundError);
  });

  it('не нараховує монети не-студенту', async () => {
    findById.mockResolvedValue(activeStudent({ role: UserRole.TEACHER }));

    await expect(coinService.createTransaction(payload, admin)).rejects.toThrow(NotFoundError);
  });

  it('викладач не нараховує монети студенту чужої групи', async () => {
    findById.mockResolvedValue(activeStudent({ groupId: OTHER_GROUP }));

    await expect(coinService.createTransaction(payload, teacher)).rejects.toThrow(ForbiddenError);
    expect(createWithBalance).not.toHaveBeenCalled();
  });

  it('викладач нараховує монети студенту своєї групи', async () => {
    findById.mockResolvedValue(activeStudent());

    await expect(coinService.createTransaction(payload, teacher)).resolves.toEqual({ id: 'tx-1' });
  });

  it('адмін нараховує монети студенту будь-якої групи', async () => {
    findById.mockResolvedValue(activeStudent({ groupId: OTHER_GROUP }));

    await expect(coinService.createTransaction(payload, admin)).resolves.toEqual({ id: 'tx-1' });
  });

  it('записує автора транзакції та академію', async () => {
    findById.mockResolvedValue(activeStudent());

    await coinService.createTransaction(payload, teacher);

    expect(createWithBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        academyId: 'academy-1',
        issuedBy: teacher.userId,
        studentId: 'student-1',
        amount: 50,
        relatedLessonId: null,
      })
    );
  });

  // Ledger append-only: списання не можна «обрізати» до нуля, інакше сума
  // транзакцій розійдеться з балансом
  it('відхиляє списання, яке завело б баланс у мінус', async () => {
    findById.mockResolvedValue(activeStudent({ redCoins: 10 }));
    createWithBalance.mockResolvedValue(null as never);

    await expect(coinService.createTransaction({ ...payload, amount: -50 }, admin)).rejects.toThrow(
      BadRequestError
    );
  });

  // Раніше неіснуючий relatedLessonId падав на FK і повертався як 500
  it('на неіснуюче заняття відповідає 400, а не 500', async () => {
    findById.mockResolvedValue(activeStudent());
    createWithBalance.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: 'test',
      })
    );

    await expect(
      coinService.createTransaction({ ...payload, relatedLessonId: 'lesson-gone' }, admin)
    ).rejects.toThrow('Заняття relatedLessonId не існує');
  });

  it('інші помилки БД не маскує', async () => {
    findById.mockResolvedValue(activeStudent());
    createWithBalance.mockRejectedValue(new Error('connection lost'));

    await expect(coinService.createTransaction(payload, admin)).rejects.toThrow('connection lost');
  });

  it('повідомляє поточний баланс, коли монет не вистачає', async () => {
    findById.mockResolvedValue(activeStudent({ redCoins: 10 }));
    createWithBalance.mockResolvedValue(null as never);

    await expect(coinService.createTransaction({ ...payload, amount: -50 }, admin)).rejects.toThrow(
      'Недостатньо монет на балансі студента (зараз 10)'
    );
  });
});

describe('getLeaderboard', () => {
  it('нумерує позиції з одиниці', async () => {
    findLeaderboard.mockResolvedValue([
      {
        id: 's1',
        firstName: 'Анна',
        lastName: 'К',
        avatar: null,
        redCoins: 90,
        group: { name: 'JS-1' },
      },
      { id: 's2', firstName: 'Богдан', lastName: 'Л', avatar: null, redCoins: 40, group: null },
    ] as never);

    const rows = await coinService.getLeaderboard({ limit: 10 }, admin);

    expect(rows.map((row) => row.position)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({ studentId: 's1', groupName: 'JS-1', redCoins: 90 });
    expect(rows[1]?.groupName).toBeNull();
  });

  // Студент бачить рейтинг лише своєї групи — чужі бали його не стосуються
  it('звужує рейтинг до групи студента', async () => {
    findById.mockResolvedValue(activeStudent());
    findLeaderboard.mockResolvedValue([] as never);

    await coinService.getLeaderboard({ groupId: OTHER_GROUP, limit: 10 }, student);

    expect(findLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: OWN_GROUP }),
      10
    );
  });

  it('повертає порожній рейтинг студенту без групи', async () => {
    findById.mockResolvedValue(activeStudent({ groupId: null }));

    await expect(coinService.getLeaderboard({ limit: 10 }, student)).resolves.toEqual([]);
    expect(findLeaderboard).not.toHaveBeenCalled();
  });
});

describe('getBalance', () => {
  it('не показує баланс неіснуючого студента', async () => {
    findById.mockResolvedValue(null as never);

    await expect(coinService.getBalance('student-1', admin)).rejects.toThrow(NotFoundError);
  });

  it('не показує баланс студента чужої групи викладачу', async () => {
    findById.mockResolvedValue(activeStudent({ groupId: OTHER_GROUP }));

    await expect(coinService.getBalance('student-1', teacher)).rejects.toThrow(ForbiddenError);
  });

  it('повертає баланс разом із сумами нарахувань і списань', async () => {
    findById.mockResolvedValue(activeStudent());
    sumByDirection.mockResolvedValue({ earned: 150, spent: 50 } as never);

    await expect(coinService.getBalance('student-1', student)).resolves.toEqual({
      studentId: 'student-1',
      balance: 100,
      earned: 150,
      spent: 50,
    });
  });
});
