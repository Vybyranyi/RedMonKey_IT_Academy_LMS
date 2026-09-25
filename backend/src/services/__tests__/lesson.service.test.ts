import { LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../../repositories/academy.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { lessonRepository } from '../../repositories/lesson.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { assertGroupStudents } from '../attendance.service.js';
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
    completeWithAttendance: vi.fn(),
  },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findById: vi.fn() },
}));
vi.mock('../attendance.service.js', () => ({
  assertGroupStudents: vi.fn(),
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const findGroup = vi.mocked(groupRepository.findByIdActive);
const lessonFindAll = vi.mocked(lessonRepository.findAll);
const lessonCreate = vi.mocked(lessonRepository.create);
const lessonUpdate = vi.mocked(lessonRepository.update);
const findSubjectById = vi.mocked(lessonRepository.findSubjectById);
const userFindById = vi.mocked(userRepository.findById);
const completeWithAttendance = vi.mocked(lessonRepository.completeWithAttendance);
const checkGroupStudents = vi.mocked(assertGroupStudents);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const LESSON_ID = 'lesson-1';

const activeTeacherRow = { id: 'teacher-9', role: UserRole.TEACHER, isActive: true };
const activeTeacher = activeTeacherRow as never;

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
  completeWithAttendance.mockResolvedValue({ id: LESSON_ID } as never);
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
    userFindById.mockResolvedValue(activeTeacher);

    await lessonService.createLesson({ ...lessonPayload, teacherId: 'teacher-9' }, admin);

    expect(userFindById).toHaveBeenCalledWith('teacher-9');
    expect(lessonCreate).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'teacher-9' }));
  });

  // Раніше неіснуючий teacherId падав на FK як 500, а id студента ставав «викладачем»
  it.each([
    ['неіснуючому користувачу', null],
    ['студенту', { ...activeTeacherRow, role: UserRole.STUDENT }],
    ['деактивованому викладачу', { ...activeTeacherRow, isActive: false }],
  ])('не призначає заняття %s', async (_label, user) => {
    userFindById.mockResolvedValue(user as never);

    await expect(
      lessonService.createLesson({ ...lessonPayload, teacherId: 'teacher-9' }, admin)
    ).rejects.toThrow('teacherId має належати активному викладачу');
    expect(lessonCreate).not.toHaveBeenCalled();
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
    userFindById.mockResolvedValue(activeTeacher);

    await lessonService.updateLesson(LESSON_ID, { teacherId: 'teacher-9' }, admin);

    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { teacherId: 'teacher-9' });
  });

  it('не перепризначає заняття студенту', async () => {
    userFindById.mockResolvedValue({ ...activeTeacherRow, role: UserRole.STUDENT } as never);

    await expect(
      lessonService.updateLesson(LESSON_ID, { teacherId: 'student-1' }, admin)
    ).rejects.toThrow(BadRequestError);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  // createLesson групу перевіряв, а PATCH — ні: неіснуюча група давала 500 на FK
  it('не переносить заняття в неіснуючу чи деактивовану групу', async () => {
    findGroup.mockResolvedValue(null as never);

    await expect(
      lessonService.updateLesson(LESSON_ID, { groupId: 'group-gone' }, teacher)
    ).rejects.toThrow(NotFoundError);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('переносить заняття в іншу активну групу', async () => {
    await lessonService.updateLesson(LESSON_ID, { groupId: 'group-2' }, teacher);

    expect(findGroup).toHaveBeenCalledWith('group-2');
    expect(lessonUpdate).toHaveBeenCalledWith(LESSON_ID, { groupId: 'group-2' });
  });
});

describe('домашнє завдання: дедлайн не раніше заняття', () => {
  const LESSON_DATE = new Date('2026-09-10T15:00:00Z');

  beforeEach(() => {
    findSubjectById.mockResolvedValue({
      teacherId: teacher.userId,
      groupId: OWN_GROUP,
      date: LESSON_DATE,
      homeworkDueDate: new Date('2026-09-12T20:59:00Z'),
    } as never);
  });

  it('створює заняття з домашнім завданням і дедлайном', async () => {
    await lessonService.createLesson(
      {
        ...lessonPayload,
        homeworkDescription: 'Задачі 1–5',
        homeworkDueDate: '2026-09-03T20:59:00Z',
      },
      teacher
    );

    expect(lessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        homeworkDescription: 'Задачі 1–5',
        homeworkDueDate: new Date('2026-09-03T20:59:00Z'),
      })
    );
  });

  it('без домашнього завдання пише null, а не порожній рядок', async () => {
    await lessonService.createLesson({ ...lessonPayload, homeworkDescription: '' }, teacher);

    expect(lessonCreate).toHaveBeenCalledWith(
      expect.objectContaining({ homeworkDescription: null, homeworkDueDate: null })
    );
  });

  it('не створює заняття з дедлайном раніше за саме заняття', async () => {
    await expect(
      lessonService.createLesson(
        { ...lessonPayload, homeworkDueDate: '2026-08-31T20:59:00Z' },
        teacher
      )
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Дедлайн') });
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  // Дата заняття в запиті відсутня — звіряємо з тією, що в БД
  it('PATCH лише дедлайну раніше за збережену дату заняття — 400', async () => {
    await expect(
      lessonService.updateLesson(LESSON_ID, { homeworkDueDate: '2026-09-09T20:59:00Z' }, teacher)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('перенесення заняття пізніше за збережений дедлайн — 400', async () => {
    await expect(
      lessonService.updateLesson(LESSON_ID, { date: '2026-09-14T15:00:00Z' }, teacher)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('перенесення разом із новим дедлайном проходить', async () => {
    await lessonService.updateLesson(
      LESSON_ID,
      { date: '2026-09-14T15:00:00Z', homeworkDueDate: '2026-09-16T20:59:00Z' },
      teacher
    );

    expect(lessonUpdate).toHaveBeenCalledWith(
      LESSON_ID,
      expect.objectContaining({ homeworkDueDate: new Date('2026-09-16T20:59:00Z') })
    );
  });

  it('null прибирає дедлайн — і тоді заняття можна переносити як завгодно', async () => {
    await lessonService.updateLesson(
      LESSON_ID,
      { date: '2026-10-01T15:00:00Z', homeworkDueDate: null },
      teacher
    );

    expect(lessonUpdate).toHaveBeenCalledWith(
      LESSON_ID,
      expect.objectContaining({ homeworkDueDate: null })
    );
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
  const records = [{ studentId: 'student-1', status: 'present' as never, note: '' }];

  // Явка і статус — одна транзакція: раніше це були два окремі записи
  it('закриває заняття і зберігає явку однією транзакцією', async () => {
    await lessonService.completeLesson(LESSON_ID, records, teacher);

    expect(completeWithAttendance).toHaveBeenCalledWith(LESSON_ID, 'academy-1', records);
    expect(lessonUpdate).not.toHaveBeenCalled();
  });

  it('відмічає лише студентів групи заняття', async () => {
    await lessonService.completeLesson(LESSON_ID, records, teacher);

    expect(checkGroupStudents).toHaveBeenCalledWith(OWN_GROUP, records);
  });

  it('на чужих студентах нічого не записує', async () => {
    checkGroupStudents.mockRejectedValueOnce(new BadRequestError('чужі студенти'));

    await expect(lessonService.completeLesson(LESSON_ID, records, teacher)).rejects.toThrow(
      BadRequestError
    );
    expect(completeWithAttendance).not.toHaveBeenCalled();
  });

  it('закриває заняття без записів явки', async () => {
    await lessonService.completeLesson(LESSON_ID, [], teacher);

    expect(completeWithAttendance).toHaveBeenCalledWith(LESSON_ID, 'academy-1', []);
  });

  // У UI кнопки «Провести» для скасованого заняття немає — API має поводитись так само
  it('не проводить скасоване заняття', async () => {
    findSubjectById.mockResolvedValue({
      teacherId: teacher.userId,
      groupId: OWN_GROUP,
      status: LessonStatus.CANCELLED,
    } as never);

    await expect(lessonService.completeLesson(LESSON_ID, records, teacher)).rejects.toThrow(
      'Скасоване заняття не можна провести'
    );
    expect(completeWithAttendance).not.toHaveBeenCalled();
  });

  it('студент не закриває заняття', async () => {
    await expect(lessonService.completeLesson(LESSON_ID, [], student)).rejects.toThrow(
      ForbiddenError
    );
  });
});
