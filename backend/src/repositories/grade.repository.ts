import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const teacherSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const lessonSelect = {
  id: true,
  title: true,
  date: true,
} satisfies Prisma.LessonSelect;

const gradeInclude = {
  student: { select: studentSelect },
  teacher: { select: teacherSelect },
  lesson: { select: lessonSelect },
} satisfies Prisma.GradeInclude;

export const gradeRepository = {
  async findAll(where: Prisma.GradeWhereInput) {
    return prisma.grade.findMany({
      where,
      include: gradeInclude,
      // Журнал читає оцінки колонками по заняттях, тож сортуємо за датою заняття
      orderBy: [{ lesson: { date: 'asc' } }, { createdAt: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.grade.findUnique({ where: { id }, include: gradeInclude });
  },

  /** Мінімум полів для перевірки доступу — без зайвих join-ів. */
  async findSubjectById(id: string) {
    return prisma.grade.findUnique({
      where: { id },
      select: { id: true, teacherId: true, studentId: true, lessonId: true },
    });
  },

  async create(data: Prisma.GradeUncheckedCreateInput) {
    return prisma.grade.create({ data, include: gradeInclude });
  },

  async update(id: string, data: Prisma.GradeUncheckedUpdateInput) {
    return prisma.grade.update({ where: { id }, data, include: gradeInclude });
  },

  async remove(id: string) {
    return prisma.grade.delete({ where: { id } });
  },

  /**
   * Масове виставлення. Одна транзакція: або зберігається все, або нічого.
   * upsert по @@unique([studentId, lessonId, type]) робить повторне збереження
   * того самого заняття безпечним — дублікатів не буде, оцінки просто оновляться.
   */
  async upsertMany(
    academyId: string,
    lessonId: string,
    teacherId: string,
    type: Prisma.GradeUncheckedCreateInput['type'],
    grades: { studentId: string; value: number; comment?: string }[]
  ) {
    return prisma.$transaction(
      grades.map((grade) =>
        prisma.grade.upsert({
          where: {
            studentId_lessonId_type: { studentId: grade.studentId, lessonId, type },
          },
          create: {
            academyId,
            lessonId,
            teacherId,
            type,
            studentId: grade.studentId,
            value: grade.value,
            comment: grade.comment ?? null,
          },
          update: {
            value: grade.value,
            comment: grade.comment ?? null,
            // Автором стає той, хто виставив останнім — саме він потім зможе редагувати
            teacherId,
          },
          include: gradeInclude,
        })
      )
    );
  },

  /**
   * Середні бали студентів одним запитом — щоб журнал не рахував їх у циклі
   * і не робив N запитів на групу.
   * Повертає [{ studentId, _avg: { value }, _count: { _all } }].
   */
  async averageByStudent(where: Prisma.GradeWhereInput) {
    return prisma.grade.groupBy({
      by: ['studentId'],
      where,
      _avg: { value: true },
      _count: { _all: true },
    });
  },
};
