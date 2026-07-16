import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const teacherSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const studentListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const studentDetailSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
  redCoins: true,
} satisfies Prisma.UserSelect;

type RawGroup = { teachers: { teacher: unknown }[]; students: unknown[] } & Record<string, unknown>;

/** Розгортає M:N teachers → плоский масив User[], зберігаючи API-контракт із Mongo-часів. */
const flatten = ({ teachers, ...group }: RawGroup) => ({
  ...group,
  teachers: teachers.map((row) => row.teacher),
});

export const groupRepository = {
  async findAllActive() {
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        teachers: { include: { teacher: { select: teacherSelect } } },
        students: { where: { isActive: true }, select: studentListSelect },
      },
    });
    return groups.map(flatten);
  },

  async findByIdActive(id: string) {
    const group = await prisma.group.findFirst({
      where: { id, isActive: true },
      include: {
        teachers: { include: { teacher: { select: teacherSelect } } },
        students: { where: { isActive: true }, select: studentDetailSelect },
      },
    });
    return group ? flatten(group) : null;
  },

  async findByName(name: string) {
    return prisma.group.findFirst({ where: { name } });
  },

  /** Id активних груп, у яких користувач числиться викладачем. */
  async findIdsByTeacher(teacherId: string): Promise<string[]> {
    const rows = await prisma.groupTeacher.findMany({
      where: { teacherId, group: { isActive: true } },
      select: { groupId: true },
    });
    return rows.map((row) => row.groupId);
  },

  async create(
    data: Omit<Prisma.GroupUncheckedCreateInput, 'teachers'>,
    teacherIds: string[]
  ) {
    const group = await prisma.group.create({
      data: {
        ...data,
        teachers: {
          create: teacherIds.map((teacherId) => ({ teacherId, academyId: data.academyId })),
        },
      },
      include: {
        teachers: { include: { teacher: { select: teacherSelect } } },
        students: { where: { isActive: true }, select: studentDetailSelect },
      },
    });
    return flatten(group);
  },

  /** Оновлює скалярні поля; за наявності teacherIds повністю пересинхронізовує M:N. */
  async update(
    id: string,
    data: Prisma.GroupUncheckedUpdateInput,
    teacherIds?: string[]
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.group.findUnique({ where: { id }, select: { academyId: true } });
      if (!existing) return null;

      if (teacherIds) {
        await tx.groupTeacher.deleteMany({ where: { groupId: id } });
        if (teacherIds.length > 0) {
          await tx.groupTeacher.createMany({
            data: teacherIds.map((teacherId) => ({
              groupId: id,
              teacherId,
              academyId: existing.academyId,
            })),
          });
        }
      }

      const group = await tx.group.update({
        where: { id },
        data,
        include: {
          teachers: { include: { teacher: { select: teacherSelect } } },
          students: { where: { isActive: true }, select: studentDetailSelect },
        },
      });
      return flatten(group);
    });
  },

  async deactivate(id: string) {
    const group = await prisma.group.update({
      where: { id },
      data: { isActive: false },
      include: {
        teachers: { include: { teacher: { select: teacherSelect } } },
        students: { where: { isActive: true }, select: studentDetailSelect },
      },
    });
    return flatten(group);
  },
};
