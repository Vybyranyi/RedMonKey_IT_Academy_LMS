import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attendanceRepository } from '../attendance.repository.js';
import { coinRepository } from '../coin.repository.js';
import { gradeRepository } from '../grade.repository.js';
import { lessonRepository } from '../lesson.repository.js';

/**
 * Транзакційна логіка без БД. Фейковий Prisma розрізняє запити в транзакції й поза нею:
 * - інтерактивна транзакція ($transaction(async (tx) => ...)) отримує окремий клієнт tx —
 *   запит через глобальний prisma всередині колбека пройшов би повз транзакцію;
 * - пакетна ($transaction([...])) отримує масив ще не виконаних запитів. Тут кожен запит —
 *   опис { model, method, args }, тож видно, що саме пішло в одну транзакцію.
 * Поведінку під конкуренцією (два одночасні списання) фейк не відтворить — її перевірено
 * на Postgres, умову в UPDATE, яка її забезпечує, фіксує тест нижче.
 */
const { prisma, tx } = vi.hoisted(() => {
  const query = (model: string, method: string) =>
    vi.fn((args: Record<string, unknown>) => ({ model, method, args }));
  const client = () => ({
    user: { updateMany: vi.fn() },
    coinTransaction: { create: vi.fn() },
    grade: { upsert: query('grade', 'upsert') },
    attendance: { upsert: query('attendance', 'upsert') },
    lesson: { update: query('lesson', 'update') },
  });
  return { prisma: { ...client(), $transaction: vi.fn() }, tx: client() };
});

vi.mock('../../lib/prisma.js', () => ({ prisma }));

/** Запити, які пішли в пакетну транзакцію, у порядку виконання. */
const batch = () => prisma.$transaction.mock.calls[0]?.[0] as { model: string; method: string }[];

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('constraint failed', { code, clientVersion: 'test' });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? arg(tx) : arg
  );
  tx.user.updateMany.mockResolvedValue({ count: 1 });
  tx.coinTransaction.create.mockResolvedValue({ id: 'tx-1' });
});

describe('coinRepository.createWithBalance — баланс і ledger в одній транзакції', () => {
  const transaction = {
    academyId: 'academy-1',
    studentId: 'student-1',
    issuedBy: 'teacher-1',
    reason: 'Активність на занятті',
    category: 'activity' as const,
  };

  // Окремий SELECT балансу перед UPDATE пропускав два одночасні списання:
  // обидва бачили той самий баланс. Умова в самому UPDATE перевіряється вже
  // на заблокованому рядку зі свіжим балансом
  it('списує, лише якщо баланс покриває суму, — умовою в самому UPDATE', async () => {
    await coinRepository.createWithBalance({ ...transaction, amount: -30 });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'student-1', redCoins: { gte: 30 } },
      data: { redCoins: { increment: -30 } },
    });
  });

  it('нарахування не залежить від поточного балансу', async () => {
    await coinRepository.createWithBalance({ ...transaction, amount: 50 });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { redCoins: { increment: 50 } },
    });
  });

  it('змінює баланс і пише в ledger тим самим tx', async () => {
    const result = await coinRepository.createWithBalance({ ...transaction, amount: 50 });

    expect(result).toEqual({ id: 'tx-1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.coinTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...transaction, amount: 50 } })
    );
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.coinTransaction.create).not.toHaveBeenCalled();
  });

  // Повернення null — це commit, а не відкат: якби запис у ledger ішов першим,
  // він би лишився без зміни балансу
  it('коли монет не вистачає, повертає null і нічого не пише в ledger', async () => {
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      coinRepository.createWithBalance({ ...transaction, amount: -500 })
    ).resolves.toBeNull();
    expect(tx.coinTransaction.create).not.toHaveBeenCalled();
  });

  // Помилка, що вилетіла з колбека, і є сигналом Prisma відкотити транзакцію
  it('помилку запису в ledger не ковтає — інакше баланс лишився б зміненим', async () => {
    const error = prismaError('P2003');
    tx.coinTransaction.create.mockRejectedValue(error);

    await expect(coinRepository.createWithBalance({ ...transaction, amount: 50 })).rejects.toBe(
      error
    );
  });
});

describe('gradeRepository.upsertMany — масове виставлення', () => {
  const save = (grades: { studentId: string; value: number; comment?: string }[]) =>
    gradeRepository.upsertMany('academy-1', 'lesson-1', 'teacher-2', 'classwork', grades);

  it('усі оцінки заняття — однією транзакцією', async () => {
    await save([
      { studentId: 'student-1', value: 10 },
      { studentId: 'student-2', value: 7 },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(batch()).toEqual([
      expect.objectContaining({ model: 'grade', method: 'upsert' }),
      expect.objectContaining({ model: 'grade', method: 'upsert' }),
    ]);
  });

  // upsert за @@unique([studentId, lessonId, type]): повторне збереження журналу
  // оновлює оцінки, а не падає на дублікаті
  it('оновлює оцінку за ключем студент + заняття + тип', async () => {
    await save([{ studentId: 'student-1', value: 11, comment: 'Молодець' }]);

    expect(prisma.grade.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_lessonId_type: {
            studentId: 'student-1',
            lessonId: 'lesson-1',
            type: 'classwork',
          },
        },
        update: { value: 11, comment: 'Молодець', teacherId: 'teacher-2' },
      })
    );
  });

  it('без коментаря записує null, а не undefined', async () => {
    await save([{ studentId: 'student-1', value: 9 }]);

    expect(prisma.grade.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ comment: null, teacherId: 'teacher-2' }),
        update: expect.objectContaining({ comment: null }),
      })
    );
  });
});

describe('attendanceRepository.upsertMany — масова явка', () => {
  it('уся явка — однією транзакцією, upsert за заняттям і студентом', async () => {
    await attendanceRepository.upsertMany('academy-1', 'lesson-1', [
      { studentId: 'student-1', status: 'present', note: '' },
      { studentId: 'student-2', status: 'absent', note: 'Хворіє' },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(batch()).toHaveLength(2);
    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lessonId_studentId: { lessonId: 'lesson-1', studentId: 'student-2' } },
        update: { status: 'absent', note: 'Хворіє' },
      })
    );
  });
});

describe('lessonRepository.completeWithAttendance — проведення заняття', () => {
  // Раніше явка й статус ішли двома транзакціями: збій другої лишав заняття
  // «запланованим» із уже збереженою явкою
  it('статус completed і явка — в одній транзакції', async () => {
    await lessonRepository.completeWithAttendance('lesson-1', 'academy-1', [
      { studentId: 'student-1', status: 'present', note: '' },
      { studentId: 'student-2', status: 'late', note: '' },
    ]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(batch().map((query) => `${query.model}.${query.method}`)).toEqual([
      'lesson.update',
      'attendance.upsert',
      'attendance.upsert',
    ]);
    expect(prisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lesson-1' }, data: { status: 'completed' } })
    );
  });

  it('повертає оновлене заняття, а не запис явки', async () => {
    const lesson = await lessonRepository.completeWithAttendance('lesson-1', 'academy-1', [
      { studentId: 'student-1', status: 'present', note: '' },
    ]);

    expect(lesson).toMatchObject({ model: 'lesson', method: 'update' });
  });

  it('без явки лише закриває заняття', async () => {
    await lessonRepository.completeWithAttendance('lesson-1', 'academy-1', []);

    expect(batch().map((query) => query.model)).toEqual(['lesson']);
  });
});
