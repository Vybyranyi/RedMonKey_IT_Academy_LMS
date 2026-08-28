import { Prisma } from "@prisma/client";
import type {
  ILessonDto,
  ILessonFilters,
  IUpdateLessonDto,
} from "@redmonkey/shared";
import { LessonStatus, UserRole } from "@redmonkey/shared";
import { academyRepository } from "../repositories/academy.repository.js";
import { groupRepository } from "../repositories/group.repository.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { TokenPayload } from "../utils/jwt.js";
import { accessPolicy } from "./access.policy.js";

export const lessonService = {
  async getLessons(filters: ILessonFilters, actor: TokenPayload) {
    const { groupId, teacherId, from, to } = filters;
    const where: Prisma.LessonWhereInput = {};

    if (groupId) where.groupId = groupId;
    if (teacherId) where.teacherId = teacherId;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)
        where.date.lte =
          to.length === 10 ? new Date(`${to}T23:59:59.999Z`) : new Date(to);
    }

    if (actor.role === UserRole.TEACHER) {
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      where.OR = [
        { teacherId: actor.userId },
        { groupId: { in: ownGroupIds } },
      ];
    } else if (actor.role === UserRole.STUDENT) {
      const student = await userRepository.findById(actor.userId);
      if (!student?.groupId) return [];
      where.groupId = student.groupId;
    }

    return lessonRepository.findAll(where);
  },

  async getLessonById(id: string, actor: TokenPayload) {
    const lesson = await lessonRepository.findById(id);
    if (!lesson) throw new NotFoundError("Заняття не знайдено");

    const allowed = await accessPolicy.canViewLesson(actor, {
      teacherId: lesson.teacherId,
      groupId: lesson.groupId,
    });
    if (!allowed)
      throw new ForbiddenError("У вас немає доступу до цього заняття");

    return lesson;
  },

  async createLesson(lessonData: ILessonDto, actor: TokenPayload) {
    const { title, description, date, duration, type, groupId, teacherId } =
      lessonData;

    const finalTeacherId =
      actor.role === UserRole.ADMIN ? teacherId || actor.userId : actor.userId;

    const group = await groupRepository.findByIdActive(groupId);
    if (!group) throw new NotFoundError("Групу не знайдено");

    const academyId = await academyRepository.getDefaultId();

    return lessonRepository.create({
      academyId,
      teacherId: finalTeacherId,
      groupId,
      title,
      description,
      date: new Date(date),
      duration,
      type,
    });
  },

  async updateLesson(
    id: string,
    lessonData: IUpdateLessonDto,
    actor: TokenPayload,
  ) {
    const subject = await lessonRepository.findSubjectById(id);
    if (!subject) throw new NotFoundError("Заняття не знайдено");

    if (!accessPolicy.canManageLesson(actor, subject)) {
      throw new ForbiddenError(
        "Редагувати заняття може лише адмін або викладач-власник",
      );
    }

    const {
      title,
      description,
      date,
      duration,
      type,
      status,
      groupId,
      teacherId,
    } = lessonData;
    const data: Prisma.LessonUncheckedUpdateInput = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = new Date(date);
    if (duration !== undefined) data.duration = duration;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (groupId !== undefined) data.groupId = groupId;
    // Перепризначити викладача може тільки адмін
    if (teacherId !== undefined && actor.role === UserRole.ADMIN)
      data.teacherId = teacherId;

    return lessonRepository.update(id, data);
  },

  /**
   * "Видалення" = переведення у статус cancelled, а не фізичне видалення.
   * Grade.lesson має onDelete: Cascade — реальний delete мовчки знищив би всі
   * виставлені за заняття оцінки. Скасоване заняття лишається в історії.
   */
  async cancelLesson(id: string, actor: TokenPayload) {
    const subject = await lessonRepository.findSubjectById(id);
    if (!subject) throw new NotFoundError("Заняття не знайдено");

    if (!accessPolicy.canManageLesson(actor, subject)) {
      throw new ForbiddenError(
        "Скасувати заняття може лише адмін або викладач-власник",
      );
    }

    return lessonRepository.update(id, { status: LessonStatus.CANCELLED });
  },
};
