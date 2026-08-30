import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import type { IBulkAttendanceDto, IUpdateAttendanceDto } from '@redmonkey/shared/src/schema/attendance.schema';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { lessonRepository } from '../repositories/lesson.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';

export const attendanceService = {
  async getAttendance(query: { lessonId?: any; studentId?: any }, actor: TokenPayload) {
    const { lessonId, studentId } = query;
    const where: Prisma.AttendanceWhereInput = {};

    if (lessonId) {
      // Побачити явку заняття може лише той, хто має доступ до самого заняття
      const subject = await lessonRepository.findSubjectById(String(lessonId));
      if (!subject) throw new NotFoundError('Заняття не знайдено');

      const allowed = await accessPolicy.canViewLesson(actor, subject);
      if (!allowed) throw new ForbiddenError('У вас немає доступу до цього заняття');

      where.lessonId = String(lessonId);
    }

    if (studentId) where.studentId = String(studentId);

    // Студент бачить лише власну явку — це перекриває будь-який studentId із query
    if (actor.role === UserRole.STUDENT) {
      where.studentId = actor.userId;
    }

    if (!where.lessonId && !where.studentId) {
      throw new BadRequestError('Вкажіть lessonId або studentId');
    }

    return attendanceRepository.findAll(where);
  },

  // Форму даних (uuid, статуси з enum, непорожній масив, дублікати studentId)
  // вже перевірила bulkAttendanceSchema в контролері. Тут лишається тільки те,
  // що схема знати не може, — доступ і зв'язок студентів із групою заняття.
  async saveBulk(data: IBulkAttendanceDto, actor: TokenPayload) {
    const { lessonId, records } = data;

    const subject = await lessonRepository.findSubjectById(lessonId);
    if (!subject) throw new NotFoundError('Заняття не знайдено');

    if (!accessPolicy.canManageLesson(actor, subject)) {
      throw new ForbiddenError('Відмічати явку може лише адмін або викладач-власник заняття');
    }

    // Не даємо відмітити чужих студентів: усі мають бути з групи цього заняття
    const groupStudents = await userRepository.findAll({
      role: UserRole.STUDENT,
      groupId: subject.groupId,
      isActive: true,
    });
    const allowedIds = new Set(groupStudents.map((student) => student.id));
    const foreign = records.filter((record) => !allowedIds.has(record.studentId));
    if (foreign.length > 0) {
      throw new BadRequestError('Серед записів є студенти, які не належать до групи заняття');
    }

    const academyId = await academyRepository.getDefaultId();
    return attendanceRepository.upsertMany(academyId, lessonId, records);
  },

  async updateStatus(id: string, data: IUpdateAttendanceDto, actor: TokenPayload) {
    const existing = await attendanceRepository.findById(id);
    if (!existing) throw new NotFoundError('Запис явки не знайдено');

    const subject = await lessonRepository.findSubjectById(existing.lessonId);
    if (!subject) throw new NotFoundError('Заняття не знайдено');

    if (!accessPolicy.canManageLesson(actor, subject)) {
      throw new ForbiddenError('Змінювати явку може лише адмін або викладач-власник заняття');
    }

    const { status, note } = data;

    const patch: Prisma.AttendanceUncheckedUpdateInput = {};
    if (status !== undefined) patch.status = status;
    if (note !== undefined) patch.note = note;

    return attendanceRepository.update(id, patch);
  },
};
