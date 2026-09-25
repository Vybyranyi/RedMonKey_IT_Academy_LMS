import { Prisma } from '@prisma/client';
import type { IAttendanceRecordDto } from '@redmonkey/shared';
import { prisma } from '../lib/prisma.js';
import { attendanceUpserts } from './attendance.repository.js';

const teacherSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const groupSelect = { id: true, name: true } satisfies Prisma.GroupSelect;

const lessonInclude = {
  teacher: { select: teacherSelect },
  group: { select: groupSelect },
} satisfies Prisma.LessonInclude;

export const lessonRepository = {
  async findAll(where: Prisma.LessonWhereInput) {
    return prisma.lesson.findMany({
      where,
      orderBy: { date: 'asc' },
      include: lessonInclude,
    });
  },

  async findById(id: string) {
    return prisma.lesson.findUnique({ where: { id }, include: lessonInclude });
  },

  /** Id усіх занять групи — для фільтра оцінок через lesson_id замість JOIN на lessons. */
  async findIdsByGroup(groupId: string): Promise<string[]> {
    const rows = await prisma.lesson.findMany({ where: { groupId }, select: { id: true } });
    return rows.map((row) => row.id);
  },

  async findSubjectById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      select: { id: true, teacherId: true, groupId: true, status: true },
    });
  },

  async create(data: Prisma.LessonUncheckedCreateInput) {
    return prisma.lesson.create({ data, include: lessonInclude });
  },

  async update(id: string, data: Prisma.LessonUncheckedUpdateInput) {
    return prisma.lesson.update({
      where: { id },
      data,
      include: lessonInclude,
    });
  },

  /**
   * Проведення заняття: статус completed і явка — одна транзакція. Двома окремими
   * збій між ними лишав би заняття «запланованим» із уже збереженою явкою.
   */
  async completeWithAttendance(id: string, academyId: string, records: IAttendanceRecordDto[]) {
    const [lesson] = await prisma.$transaction([
      prisma.lesson.update({
        where: { id },
        data: { status: 'completed' },
        include: lessonInclude,
      }),
      ...attendanceUpserts(academyId, id, records),
    ]);
    return lesson;
  },
};
