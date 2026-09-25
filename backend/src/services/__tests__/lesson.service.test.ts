import { LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../../repositories/academy.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { lessonRepository } from '../../repositories/lesson.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { attendanceService } from '../attendance.service.js';
import { lessonService } from '../lesson.service.js';

vi.mock('../../repositories/academy.repository.js', () => ({
  academyRepository: { getDefaultId: vi.fn() },
}));
vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn(), findByIdActive: vi.fn() },
}));
vi.mock('../../repositories/lesson.repository.js', () => ({
  lessonRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findSubjectById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock('../attendance.service.js', () => ({
  attendanceService: { saveBulk: vi.fn() },
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const findGroup = vi.mocked(groupRepository.findByIdActive);
const lessonFindAll = vi.mocked(lessonRepository.findAll);
const lessonCreate = vi.mocked(lessonRepository.create);
const lessonUpdate = vi.mocked(lessonRepository.update);
const findSubjectById = vi.mocked(lessonRepository.findSubjectById);
const userFindById = vi.mocked(userRepository.findById);
const saveBulk = vi.mocked(attendanceService.saveBulk);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const LESSON_ID = 'lesson-1';

const lessonPayload = {
  title: 'Вступ до TypeScript',
  description: '',
  date: '2026-09-01T10:00:00Z',
  duration: 80,
  type: LessonType.LECTURE,
  groupId: OWN_GROUP,
};

beforeEach(() => {
  vi.clearAllMocks();
  getDefaultId.mockResolvedValue('academy-1');
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  findGroup.mockResolvedValue({ id: OWN_GROUP } as never);
  lessonFindAll.mockResolvedValue([] as never);
  lessonCreate.mockResolvedValue({ id: LESSON_ID } as never);
  lessonUpdate.mockResolvedValue({ id: LESSON_ID } as never);
  findSubjectById.mockResolvedValue({ teacherId: teacher.userId, groupId: OWN_GROUP } as never);
});

describe('getLessons', () => {
  it('переводить межі діапазону в дати', async () => {
    await lessonService.getLessons({ from: '2026-09-01', to: '2026-09-07' }, admin);

    const where = lessonFindAll.mock.calls[0]?.[0] as { date: { gte: Date; lte: Date } };
    expect(where.date.gte).toEqual(new Date('2026-09-01'));
    // Коротка дата «до» має включати весь день, інакше останній день випадає з тижня
    expect(where.date.lte).toEqual(new Date('2026-09-07T23:59:59.999Z'));
  });

  it('викладач бачить свої заняття та заняття своїх груп', async () => {
    await lessonService.getLessons({}, teacher);

    expect(lessonFindAll).toHaveBeenCalledWith({
      OR: [{ teacherId: teacher.userId }, { groupId: { in: [OWN_GROUP] } }],
    });
  });

  it('студент бачить лише заняття своєї групи', async () => {
    userFindById.mockResolvedValue({ groupId: OWN_GROUP } as never);

    await lessonService.getLessons({}, student);

    expect(lessonFindAll).toHaveBeenCalledWith({ groupId: OWN_GROUP });
  });

  it('студенту без групи віддає порожній розклад', async () => {
    userFindById.mockResolvedValue({ groupId: null } as never);

    await expect(lessonService.getLessons({}, student)).resolves.toEqual([]);
    expect(lessonFindAll).not.toHaveBeenCalled();
  });
});

describe('createLesson', () => {
  it('не створює заняття для неіснуючої групи', async () => {
    findGroup.mockResolvedValue(null as never);

    await expect(lessonService.createLesson(lessonPayload, admin)).rejects.toThrow(NotFoundError);
  });

  // Викладач може створити заняття лише на себе, навіть якщо підставить чужий teacherId
  it('ігнорує teacherId із тіла запиту для викладача', async () => {
    await lessonService.createLesson({ ...lessonPayload, teacherId: 'teacher-9' }, teacher);

    expect(lessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: teacher.userId })
    );
  });

  it('адмін може призначити заняття іншому викладачу', async () => {
    await lessonService.createLesson({ ...lessonPayload, teacherId: 'teacher-9' }, admin);

    expect(lessonCreate).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'teacher-9' }));
  });

  it('адмін без teacherId стає викладачем заняття', async () => {
    await lessonService.createLesson(lessonPayload, admin);

    expect(lessonCreate).toHaveBeenCalledWith(expect.objectContaining({ teacherId: admin.userId }));
  });
});

describe('updateLesson', () => {
  it('викладач не редагує чуже заняття', async () => {
    findSubjectById.mockResolvedValue({ teacherId: 'teacher-9', groupId: OWN_GROUP } as never);

    await expect(
      lessonService.updateLesson(LESSON_ID, { title: 'Нова назва' }, teacher)
    ).rejects.toThrow(ForbiddenError);
  });

  it('оновлює лише передані поля', async () => {
    await lessonService.updateLesson(LESSON_ID, { title: 'Нова назва' }, teacher);

    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { title: 'Нова назва' });
  });

  // Перепризначити викладача може тільки адмін
  it('не дає викладачу перепризначити заняття на іншого', async () => {
    await lessonService.updateLesson(LESSON_ID, { teacherId: 'teacher-9' }, teacher);

    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, {});
  });

  it('дає адміну перепризначити викладача', async () => {
    await lessonService.updateLesson(LESSON_ID, { teacherId: 'teacher-9' }, admin);

    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { teacherId: 'teacher-9' });
  });
});

describe('cancelLesson', () => {
  // Grade.lesson має onDelete: Cascade — реальний delete знищив би всі оцінки
  it('переводить заняття у статус cancelled, а не видаляє', async () => {
    await lessonService.cancelLesson(LESSON_ID, teacher);

    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { status: LessonStatus.CANCELLED });
  });

  it('викладач не скасовує чуже заняття', async () => {
    findSubjectById.mockResolvedValue({ teacherId: 'teacher-9', groupId: OWN_GROUP } as never);

    await expect(lessonService.cancelLesson(LESSON_ID, teacher)).rejects.toThrow(ForbiddenError);
  });

  it('не скасовує неіснуюче заняття', async () => {
    findSubjectById.mockResolvedValue(null as never);

    await expect(lessonService.cancelLesson(LESSON_ID, teacher)).rejects.toThrow(NotFoundError);
  });
});

describe('completeLesson', () => {
  it('зберігає явку і закриває заняття', async () => {
    const records = [{ studentId: 'student-1', status: 'present' as never, note: '' }];

    await lessonService.completeLesson(LESSON_ID, records, teacher);

    expect(saveBulk).toHaveBeenCalledWith({ lessonId: LESSON_ID, records }, teacher);
    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { status: LessonStatus.COMPLETED });
  });

  it('закриває заняття без записів явки', async () => {
    await lessonService.completeLesson(LESSON_ID, [], teacher);

    expect(saveBulk).not.toHaveBeenCalled();
    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { status: LessonStatus.COMPLETED });
  });

  it('студент не закриває заняття', async () => {
    await expect(lessonService.completeLesson(LESSON_ID, [], student)).rejects.toThrow(
      ForbiddenError
    );
  });
});
