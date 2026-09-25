import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { statsRepository } from '../stats.repository.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: { grade: { groupBy: vi.fn() }, attendance: { groupBy: vi.fn() } },
}));

const gradeGroupBy = vi.mocked(prisma.grade.groupBy);
const attendanceGroupBy = vi.mocked(prisma.attendance.groupBy);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('statsRepository.averageGrades', () => {
  // student_id IN (...), а не зв'язок: той Prisma перетворює на JOIN (QUERY_PLANS.md)
  it('рахує середні одним GROUP BY по списку студентів', async () => {
    gradeGroupBy.mockResolvedValue([] as never);

    await statsRepository.averageGrades(['student-1', 'student-2']);

    expect(gradeGroupBy).toHaveBeenCalledTimes(1);
    expect(gradeGroupBy).toHaveBeenCalledWith({
      by: ['studentId'],
      where: { studentId: { in: ['student-1', 'student-2'] } },
      _avg: { value: true },
    });
  });

  it('округлює середнє до сотих, як GET /users/:id/stats', async () => {
    gradeGroupBy.mockResolvedValue([
      { studentId: 'student-1', _avg: { value: 26 / 3 } },
      { studentId: 'student-2', _avg: { value: 10 } },
    ] as never);

    const averages = await statsRepository.averageGrades(['student-1', 'student-2', 'student-3']);

    expect(averages.get('student-1')).toBe(8.67);
    expect(averages.get('student-2')).toBe(10);
    // Без оцінок — рядка немає, і це не нуль
    expect(averages.has('student-3')).toBe(false);
  });
});

describe('statsRepository.attendanceRates', () => {
  it('групує явку за студентом і статусом одним запитом', async () => {
    attendanceGroupBy.mockResolvedValue([] as never);

    await statsRepository.attendanceRates(['student-1']);

    expect(attendanceGroupBy).toHaveBeenCalledTimes(1);
    expect(attendanceGroupBy).toHaveBeenCalledWith({
      by: ['studentId', 'status'],
      where: { studentId: { in: ['student-1'] } },
      _count: { _all: true },
    });
  });

  // Та сама формула, що в attendanceStats: запізнення й поважна причина — не пропуск
  it('складає статуси кожного студента окремо', async () => {
    attendanceGroupBy.mockResolvedValue([
      { studentId: 'student-1', status: 'present', _count: { _all: 6 } },
      { studentId: 'student-1', status: 'late', _count: { _all: 1 } },
      { studentId: 'student-1', status: 'excused', _count: { _all: 1 } },
      { studentId: 'student-1', status: 'absent', _count: { _all: 2 } },
      { studentId: 'student-2', status: 'absent', _count: { _all: 3 } },
      { studentId: 'student-3', status: 'present', _count: { _all: 2 } },
      { studentId: 'student-3', status: 'absent', _count: { _all: 1 } },
    ] as never);

    const rates = await statsRepository.attendanceRates(['student-1', 'student-2', 'student-3']);

    expect(rates.get('student-1')).toBe(80);
    expect(rates.get('student-2')).toBe(0);
    expect(rates.get('student-3')).toBe(67);
  });

  it('студента без жодної відмітки в результаті немає', async () => {
    attendanceGroupBy.mockResolvedValue([] as never);

    const rates = await statsRepository.attendanceRates(['student-1']);

    expect(rates.has('student-1')).toBe(false);
  });
});
