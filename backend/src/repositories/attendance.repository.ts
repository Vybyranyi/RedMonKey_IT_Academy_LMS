import { Prisma } from '@prisma/client';
import type { IAttendanceRecordDto } from '@redmonkey/shared';
import { prisma } from '../lib/prisma.js';

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export const attendanceRepository = {
  async findAll(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.findMany({
      where,
      include: { student: { select: studentSelect } },
      orderBy: { student: { lastName: 'asc' } },
    });
  },

  async findById(id: string) {
    return prisma.attendance.findUnique({ where: { id } });
  },

  async update(id: string, data: Prisma.AttendanceUncheckedUpdateInput) {
    return prisma.attendance.update({
      where: { id },
      data,
      include: { student: { select: studentSelect } },
    });
  },

  /**
   * Масове збереження явки. Одна транзакція: або зберігається все, або нічого.
   * upsert по @@unique([lessonId, studentId]) робить повторне збереження
   * того самого заняття безпечним — дублікатів не буде.
   */
  async upsertMany(
    academyId: string,
    lessonId: string,
    records: IAttendanceRecordDto[]
  ) {
    return prisma.$transaction(
      records.map((record) =>
        prisma.attendance.upsert({
          where: { lessonId_studentId: { lessonId, studentId: record.studentId } },
          create: {
            academyId,
            lessonId,
            studentId: record.studentId,
            status: record.status,
            note: record.note,
          },
          update: {
            status: record.status,
            note: record.note,
          },
        })
      )
    );
  },
};
