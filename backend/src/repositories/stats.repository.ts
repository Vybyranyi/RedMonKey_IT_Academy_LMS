import { prisma } from '../lib/prisma.js';

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
      // null, а не 0: «оцінок ще немає» — це не те саме, що середній бал нуль
      average: result._avg.value != null ? Number(result._avg.value.toFixed(2)) : null,
      count: result._count._all,
    };
  },

  async attendanceStats(studentId: string) {
    const rows = await prisma.attendance.groupBy({
      by: ['status'],
      where: { studentId },
      _count: { _all: true },
    });

    const byStatus = new Map<string, number>(rows.map((row: { status: string; _count: { _all: number } }) => [row.status, row._count._all]));
    const present = byStatus.get('present') ?? 0;
    const late = byStatus.get('late') ?? 0;
    const absent = byStatus.get('absent') ?? 0;
    const excused = byStatus.get('excused') ?? 0;
    const total = present + late + absent + excused;

    return {
      total,
      present,
      absent,
      late,
      excused,
      // Запізнення рахуємо як присутність; поважна причина не псує відсоток
      rate: total > 0 ? Math.round(((present + late + excused) / total) * 100) : null,
    };
  },
};