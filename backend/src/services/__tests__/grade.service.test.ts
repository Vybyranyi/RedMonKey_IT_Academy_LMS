import { Prisma } from '@prisma/client';
import { GradeType, UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../../repositories/academy.repository.js';
import { gradeRepository } from '../../repositories/grade.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { lessonRepository } from '../../repositories/lesson.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { gradeService } from '../grade.service.js';

vi.mock('../../repositories/academy.repository.js', () => ({
  academyRepository: { getDefaultId: vi.fn() },
}));
vi.mock('../../repositories/grade.repository.js', () => ({
  gradeRepository: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upsertMany: vi.fn(),
    findSubjectById: vi.fn(),
    averageByStudent: vi.fn(),
  },
}));
vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));
vi.mock('../../repositories/lesson.repository.js', () => ({
  lessonRepository: { findSubjectById: vi.fn(), findIdsByGroup: vi.fn() },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findAll: vi.fn(), findById: vi.fn() },
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const gradeFindAll = vi.mocked(gradeRepository.findAll);
const gradeCreate = vi.mocked(gradeRepository.create);
const gradeRemove = vi.mocked(gradeRepository.remove);
const gradeUpsertMany = vi.mocked(gradeRepository.upsertMany);
const gradeFindSubject = vi.mocked(gradeRepository.findSubjectById);
const averageByStudent = vi.mocked(gradeRepository.averageByStudent);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const lessonFindSubject = vi.mocked(lessonRepository.findSubjectById);
const findLessonIdsByGroup = vi.mocked(lessonRepository.findIdsByGroup);
const userFindAll = vi.mocked(userRepository.findAll);
const userFindById = vi.mocked(userRepository.findById);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const OTHER_GROUP = 'group-other';
const LESSON_ID = 'lesson-1';
const GROUP_LESSON_IDS = ['lesson-1', 'lesson-2'];

/** Помилка унікального індексу @@unique([studentId, lessonId, type]). */
const duplicateError = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

const payload = {
  studentId: 'student-1',
  lessonId: LESSON_ID,
  value: 10,
  type: GradeType.HOMEWORK,
};

beforeEach(() => {
  vi.clearAllMocks();
  getDefaultId.mockResolvedValue('academy-1');
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  gradeFindAll.mockResolvedValue([] as never);
  gradeCreate.mockResolvedValue({ id: 'grade-1' } as never);
  lessonFindSubject.mockResolvedValue({ teacherId: teacher.userId, groupId: OWN_GROUP } as never);
  findLessonIdsByGroup.mockResolvedValue(GROUP_LESSON_IDS);
  userFindById.mockResolvedValue({
    id: 'student-1',
    role: UserRole.STUDENT,
    isActive: true,
    groupId: OWN_GROUP,
  } as never);
});

describe('getGrades', () => {
  // Звуження за роллю має перекривати будь-який фільтр із query
  it('студент бачить лише власні оцінки попри фільтр у запиті', async () => {
    await gradeService.getGrades({ studentId: 'student-9' }, student);

    expect(gradeFindAll).toHaveBeenCalledWith({ studentId: student.userId });
  });

  it('викладач бачить свої оцінки та оцінки своїх груп', async () => {
    await gradeService.getGrades({}, teacher);

    expect(gradeFindAll).toHaveBeenCalledWith({
      OR: [{ teacherId: teacher.userId }, { lesson: { groupId: { in: [OWN_GROUP] } } }],
    });
  });

  // Фільтр групи — через id занять: JOIN на lessons змушував Postgres сканувати всю grades
  it('групу фільтрує через id її занять, а не через зв\'язок lesson', async () => {
    await gradeService.getGrades({ groupId: OWN_GROUP, type: GradeType.CLASSWORK }, admin);

    expect(findLessonIdsByGroup).toHaveBeenCalledWith(OWN_GROUP);
    expect(gradeFindAll).toHaveBeenCalledWith({
      type: GradeType.CLASSWORK,
      lessonId: { in: GROUP_LESSON_IDS },
    });
  });

  it('поєднує фільтри заняття й групи, а не підміняє один іншим', async () => {
    await gradeService.getGrades({ groupId: OWN_GROUP, lessonId: 'lesson-9' }, admin);

    expect(gradeFindAll).toHaveBeenCalledWith({
      lessonId: { equals: 'lesson-9', in: GROUP_LESSON_IDS },
    });
  });

  // Усі оцінки власної групи викладачу й так видно, тож OR лише додав би JOIN
  it('у журналі власної групи викладач бачить усі оцінки без OR', async () => {
    await gradeService.getGrades({ groupId: OWN_GROUP }, teacher);

    expect(gradeFindAll).toHaveBeenCalledWith({ lessonId: { in: GROUP_LESSON_IDS } });
  });

  it('у чужій групі викладач бачить лише виставлені ним оцінки', async () => {
    await gradeService.getGrades({ groupId: OTHER_GROUP }, teacher);

    expect(gradeFindAll).toHaveBeenCalledWith({
      lessonId: { in: GROUP_LESSON_IDS },
      OR: [{ teacherId: teacher.userId }, { lesson: { groupId: { in: [OWN_GROUP] } } }],
    });
  });
});

describe('createGrade', () => {
  it('не виставляє оцінку за неіснуюче заняття', async () => {
    lessonFindSubject.mockResolvedValue(null as never);

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow(NotFoundError);
  });

  it('викладач не виставляє оцінку за чуже заняття', async () => {
    lessonFindSubject.mockResolvedValue({ teacherId: 'teacher-9', groupId: OWN_GROUP } as never);

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow(ForbiddenError);
  });

  it('не виставляє оцінку неіснуючому студенту', async () => {
    userFindById.mockResolvedValue(null as never);

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow(NotFoundError);
  });

  it('не виставляє оцінку студенту з іншої групи', async () => {
    userFindById.mockResolvedValue({
      id: 'student-1',
      role: UserRole.STUDENT,
      isActive: true,
      groupId: OTHER_GROUP,
    } as never);

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow(BadRequestError);
  });

  it('записує автором оцінки того, хто її виставив', async () => {
    await gradeService.createGrade(payload, teacher);

    expect(gradeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: teacher.userId, academyId: 'academy-1', comment: null })
    );
  });

  // Дубль ловиться унікальним індексом у БД — користувач має побачити 400, а не 500
  it('перетворює дубль оцінки на зрозумілу помилку', async () => {
    gradeCreate.mockRejectedValue(duplicateError());

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow(
      'Оцінка такого типу за це заняття вже виставлена цьому студенту'
    );
  });

  it('прокидає інші помилки БД далі', async () => {
    gradeCreate.mockRejectedValue(new Error('connection lost'));

    await expect(gradeService.createGrade(payload, teacher)).rejects.toThrow('connection lost');
  });
});

describe('updateGrade', () => {
  beforeEach(() => {
    gradeFindSubject.mockResolvedValue({ teacherId: teacher.userId } as never);
  });

  it('не оновлює неіснуючу оцінку', async () => {
    gradeFindSubject.mockResolvedValue(null as never);

    await expect(gradeService.updateGrade('grade-1', { value: 8 }, admin)).rejects.toThrow(
      NotFoundError
    );
  });

  it('викладач не редагує чужу оцінку', async () => {
    gradeFindSubject.mockResolvedValue({ teacherId: 'teacher-9' } as never);

    await expect(gradeService.updateGrade('grade-1', { value: 8 }, teacher)).rejects.toThrow(
      ForbiddenError
    );
  });
});

describe('deleteGrade', () => {
  beforeEach(() => {
    gradeFindSubject.mockResolvedValue({ teacherId: teacher.userId } as never);
  });

  // ТЗ 4.5: на відміну від PATCH, DELETE дозволено лише адміну
  it('викладач не видаляє навіть власну оцінку', async () => {
    await expect(gradeService.deleteGrade('grade-1', teacher)).rejects.toThrow(ForbiddenError);
    expect(gradeRemove).not.toHaveBeenCalled();
  });

  it('адмін видаляє оцінку', async () => {
    await gradeService.deleteGrade('grade-1', admin);

    expect(gradeRemove).toHaveBeenCalledWith('grade-1');
  });

  it('не видаляє неіснуючу оцінку', async () => {
    gradeFindSubject.mockResolvedValue(null as never);

    await expect(gradeService.deleteGrade('grade-1', admin)).rejects.toThrow(NotFoundError);
  });
});

describe('saveBulk', () => {
  const bulk = {
    lessonId: LESSON_ID,
    type: GradeType.CLASSWORK,
    grades: [{ studentId: 'student-1', value: 11 }],
  };

  beforeEach(() => {
    userFindAll.mockResolvedValue([{ id: 'student-1' }] as never);
    gradeUpsertMany.mockResolvedValue([] as never);
  });

  it('зберігає оцінки студентів групи заняття', async () => {
    await gradeService.saveBulk(bulk, teacher);

    expect(gradeUpsertMany).toHaveBeenCalledWith(
      'academy-1',
      LESSON_ID,
      teacher.userId,
      GradeType.CLASSWORK,
      bulk.grades
    );
  });

  // Не даємо оцінити чужих студентів: усі мають бути з групи цього заняття
  it('відхиляє оцінки студентів не з цієї групи', async () => {
    const withForeign = {
      ...bulk,
      grades: [...bulk.grades, { studentId: 'student-9', value: 5 }],
    };

    await expect(gradeService.saveBulk(withForeign, teacher)).rejects.toThrow(BadRequestError);
    expect(gradeUpsertMany).not.toHaveBeenCalled();
  });

  it('викладач не зберігає оцінки за чуже заняття', async () => {
    lessonFindSubject.mockResolvedValue({ teacherId: 'teacher-9', groupId: OWN_GROUP } as never);

    await expect(gradeService.saveBulk(bulk, teacher)).rejects.toThrow(ForbiddenError);
  });
});

describe('getSummary', () => {
  beforeEach(() => {
    userFindAll.mockResolvedValue([
      { id: 'student-1', firstName: 'Анна', lastName: 'К' },
      { id: 'student-2', firstName: 'Богдан', lastName: 'Л' },
    ] as never);
  });

  it('викладач не бачить зведення чужої групи', async () => {
    await expect(gradeService.getSummary({ groupId: OTHER_GROUP }, teacher)).rejects.toThrow(
      ForbiddenError
    );
  });

  it('округлює середній бал до двох знаків', async () => {
    averageByStudent.mockResolvedValue([
      { studentId: 'student-1', _avg: { value: 9.666666 }, _count: { _all: 3 } },
    ] as never);

    const rows = await gradeService.getSummary({ groupId: OWN_GROUP }, teacher);

    expect(rows[0]).toEqual({
      studentId: 'student-1',
      firstName: 'Анна',
      lastName: 'К',
      average: 9.67,
      count: 3,
    });
  });

  // null, а не 0: «оцінок ще немає» — це не те саме, що «середній бал нуль»
  it('віддає null для студента без оцінок', async () => {
    averageByStudent.mockResolvedValue([] as never);

    const rows = await gradeService.getSummary({ groupId: OWN_GROUP }, admin);

    expect(rows[1]).toMatchObject({ studentId: 'student-2', average: null, count: 0 });
  });

  it('рахує середні лише за оцінками занять цієї групи', async () => {
    averageByStudent.mockResolvedValue([] as never);

    await gradeService.getSummary({ groupId: OWN_GROUP, type: GradeType.EXAM }, admin);

    expect(findLessonIdsByGroup).toHaveBeenCalledWith(OWN_GROUP);
    expect(averageByStudent).toHaveBeenCalledWith({
      lessonId: { in: GROUP_LESSON_IDS },
      type: GradeType.EXAM,
    });
  });

  it('студент бачить у зведенні лише власний рядок', async () => {
    averageByStudent.mockResolvedValue([
      { studentId: 'student-1', _avg: { value: 8 }, _count: { _all: 2 } },
    ] as never);

    const rows = await gradeService.getSummary({ groupId: OWN_GROUP }, student);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.studentId).toBe(student.userId);
  });
});
