import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import type {
  IBulkGradeDto,
  IGradeDto,
  IGradeFilters,
  IGradeSummaryFilters,
  IGradeSummaryRow,
  IUpdateGradeDto,
} from '@redmonkey/shared';
import { academyRepository } from '../repositories/academy.repository.js';
import { gradeRepository } from '../repositories/grade.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { lessonRepository } from '../repositories/lesson.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';
import { accessPolicy } from './access.policy.js';

/** Оцінка такого типу за це заняття вже стоїть — впіймано @@unique([studentId, lessonId, type]). */
const isDuplicateGrade = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export const gradeService = {
  async getGrades(filters: IGradeFilters, actor: TokenPayload) {
    const where: Prisma.GradeWhereInput = {};

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.lessonId) where.lessonId = filters.lessonId;
    if (filters.type) where.type = filters.type;
    if (filters.groupId) where.lesson = { groupId: filters.groupId };

    // Звуження за роллю перекриває будь-який фільтр із query
    if (actor.role === UserRole.STUDENT) {
      where.studentId = actor.userId;
    } else if (actor.role === UserRole.TEACHER) {
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      where.OR = [{ teacherId: actor.userId }, { lesson: { groupId: { in: ownGroupIds } } }];
    }

    return gradeRepository.findAll(where);
  },

  async createGrade(gradeData: IGradeDto, actor: TokenPayload) {
    const lesson = await lessonRepository.findSubjectById(gradeData.lessonId);
    if (!lesson) throw new NotFoundError('Заняття не знайдено');

    if (!accessPolicy.canManageLesson(actor, lesson)) {
      throw new ForbiddenError('Виставляти оцінки може лише адмін або викладач-власник заняття');
    }

    // Оцінку можна поставити тільки студенту з групи цього заняття
    const student = await userRepository.findById(gradeData.studentId);
    if (!student || !student.isActive || student.role !== UserRole.STUDENT) {
      throw new NotFoundError('Студента не знайдено');
    }
    if (student.groupId !== lesson.groupId) {
      throw new BadRequestError('Студент не належить до групи цього заняття');
    }

    const academyId = await academyRepository.getDefaultId();

    try {
      return await gradeRepository.create({
        academyId,
        studentId: gradeData.studentId,
        lessonId: gradeData.lessonId,
        teacherId: actor.userId,
        value: gradeData.value,
        type: gradeData.type,
        comment: gradeData.comment ?? null,
      });
    } catch (error) {
      if (isDuplicateGrade(error)) {
        throw new BadRequestError('Оцінка такого типу за це заняття вже виставлена цьому студенту');
      }
      throw error;
    }
  },

  async updateGrade(id: string, gradeData: IUpdateGradeDto, actor: TokenPayload) {
    const subject = await gradeRepository.findSubjectById(id);
    if (!subject) throw new NotFoundError('Оцінку не знайдено');

    if (!accessPolicy.canManageGrade(actor, subject)) {
      throw new ForbiddenError('Редагувати оцінку може лише адмін або викладач, який її виставив');
    }

    const data: Prisma.GradeUncheckedUpdateInput = {};
    if (gradeData.value !== undefined) data.value = gradeData.value;
    if (gradeData.type !== undefined) data.type = gradeData.type;
    if (gradeData.comment !== undefined) data.comment = gradeData.comment;

    try {
      return await gradeRepository.update(id, data);
    } catch (error) {
      if (isDuplicateGrade(error)) {
        throw new BadRequestError('Оцінка такого типу за це заняття вже виставлена цьому студенту');
      }
      throw error;
    }
  },

  async deleteGrade(id: string, actor: TokenPayload) {
    const subject = await gradeRepository.findSubjectById(id);
    if (!subject) throw new NotFoundError('Оцінку не знайдено');

    // DELETE у ТЗ 4.5 дозволено лише адміну — на відміну від PATCH
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Видаляти оцінки може лише адмін');
    }

    await gradeRepository.remove(id);
  },

  async saveBulk(bulkData: IBulkGradeDto, actor: TokenPayload) {
    const lesson = await lessonRepository.findSubjectById(bulkData.lessonId);
    if (!lesson) throw new NotFoundError('Заняття не знайдено');

    if (!accessPolicy.canManageLesson(actor, lesson)) {
      throw new ForbiddenError('Виставляти оцінки може лише адмін або викладач-власник заняття');
    }

    // Не даємо оцінити чужих студентів: усі мають бути з групи цього заняття
    const groupStudents = await userRepository.findAll({
      role: UserRole.STUDENT,
      groupId: lesson.groupId,
      isActive: true,
    });
    const allowedIds = new Set(groupStudents.map((student) => student.id));
    const foreign = bulkData.grades.filter((grade) => !allowedIds.has(grade.studentId));
    if (foreign.length > 0) {
      throw new BadRequestError('Серед оцінок є студенти, які не належать до групи заняття');
    }

    const academyId = await academyRepository.getDefaultId();

    return gradeRepository.upsertMany(
      academyId,
      bulkData.lessonId,
      actor.userId,
      bulkData.type,
      bulkData.grades
    );
  },

  /**
   * Середні бали студентів групи — колонка «Середнє» в журналі.
   * Рахуємо в БД одним groupBy, а не в циклі по студентах.
   */
  async getSummary(filters: IGradeSummaryFilters, actor: TokenPayload): Promise<IGradeSummaryRow[]> {
    if (actor.role === UserRole.TEACHER) {
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      if (!ownGroupIds.includes(filters.groupId)) {
        throw new ForbiddenError('У вас немає доступу до цієї групи');
      }
    }

    const students = await userRepository.findAll({
      role: UserRole.STUDENT,
      groupId: filters.groupId,
      isActive: true,
    });

    const where: Prisma.GradeWhereInput = { lesson: { groupId: filters.groupId } };
    if (filters.type) where.type = filters.type;
    // Студент бачить у зведенні лише власний рядок
    if (actor.role === UserRole.STUDENT) where.studentId = actor.userId;

    const aggregated = await gradeRepository.averageByStudent(where);
    const byStudent = new Map(aggregated.map((row) => [row.studentId, row]));

    const rows = students.map((student) => {
      const row = byStudent.get(student.id);
      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        // null, а не 0: «оцінок ще немає» — це не те саме, що «середній бал нуль»
        average: row?._avg.value != null ? Number(row._avg.value.toFixed(2)) : null,
        count: row?._count._all ?? 0,
      };
    });

    return actor.role === UserRole.STUDENT
      ? rows.filter((row) => row.studentId === actor.userId)
      : rows;
  },
};
