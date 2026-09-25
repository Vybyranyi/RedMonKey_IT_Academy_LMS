import { prisma } from '../lib/prisma.js';

type AttendanceCounts = { present: number; absent: number; late: number; excused: number };

const emptyCounts = (): AttendanceCounts => ({ present: 0, absent: 0, late: 0, excused: 0 });

// null, а не 0: «оцінок ще немає» — це не те саме, що середній бал нуль
const roundAverage = (average: number | null) =>
  average != null ? Number(average.toFixed(2)) : null;

// Запізнення рахуємо як присутність; поважна причина не псує відсоток
const attendanceRate = ({ present, absent, late, excused }: AttendanceCounts) => {
  const total = present + absent + late + excused;
  return total > 0 ? Math.round(((present + late + excused) / total) * 100) : null;
};

/**
 * Агрегації для картки статистики студента. Живуть в окремому репозиторії,
 * бо збирають дані одразу з трьох моделей і не належать жодній із них.
 */
export const statsRepository = {
  async gradeStats(studentId: string) {
    const result = await prisma.grade.aggregate({
      where: { studentId },
      _avg: { value: true },
      _count: { _all: true },
    });

    return {
      average: roundAverage(result._avg.value),
      count: result._count._all,
    };
  },

  async attendanceStats(studentId: string) {
    const rows = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId },
      _count: { _all: true },
    });

    const counts = emptyCounts();
    for (const row of rows) counts[row.status] = row._count._all;

    return {
      total: counts.present + counts.absent + counts.late + counts.excused,
      ...counts,
      rate: attendanceRate(counts),
    };
  },

  /**
   * Середні бали кількох студентів одним GROUP BY — для таблиці студентів, щоб не
   * робити запит на кожен рядок. Фільтр — student_id IN (...) по індексу grades(student_id).
   * Студента без оцінок у результаті немає.
   */
  async averageGrades(studentIds: string[]): Promise<Map<string, number | null>> {
    const rows = await prisma.grade.groupBy({
      by: ['studentId'],
      where: { studentId: { in: studentIds } },
      _avg: { value: true },
    });

    return new Map(rows.map((row) => [row.studentId, roundAverage(row._avg.value)]));
  },

  /** Відсоток відвідуваності кількох студентів одним GROUP BY (student_id, status). */
  async attendanceRates(studentIds: string[]): Promise<Map<string, number | null>> {
    const rows = await prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: { in: studentIds } },
      _count: { _all: true },
    });

    const countsByStudent = new Map<string, AttendanceCounts>();
    for (const row of rows) {
      const counts = countsByStudent.get(row.studentId) ?? emptyCounts();
      counts[row.status] = row._count._all;
      countsByStudent.set(row.studentId, counts);
    }

    return new Map(
      [...countsByStudent].map(([studentId, counts]) => [studentId, attendanceRate(counts)])
    );
  },
};
