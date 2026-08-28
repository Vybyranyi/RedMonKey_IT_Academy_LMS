import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

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
      orderBy: { date: "asc" },
      include: lessonInclude,
    });
  },

  async findById(id: string) {
    return prisma.lesson.findUnique({ where: { id }, include: lessonInclude });
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
};
