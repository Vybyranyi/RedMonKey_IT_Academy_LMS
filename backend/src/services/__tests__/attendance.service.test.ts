import { AttendanceStatus, UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { academyRepository } from '../../repositories/academy.repository.js';
import { attendanceRepository } from '../../repositories/attendance.repository.js';
import { groupRepository } from '../../repositories/group.repository.js';
import { lessonRepository } from '../../repositories/lesson.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { assertGroupStudents, attendanceService } from '../attendance.service.js';

vi.mock('../../repositories/academy.repository.js', () => ({
  academyRepository: { getDefaultId: vi.fn() },
}));
vi.mock('../../repositories/attendance.repository.js', () => ({
  attendanceRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    upsertMany: vi.fn(),
  },
}));
vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));
vi.mock('../../repositories/lesson.repository.js', () => ({
  lessonRepository: { findSubjectById: vi.fn() },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findAll: vi.fn(), findById: vi.fn() },
}));

const getDefaultId = vi.mocked(academyRepository.getDefaultId);
const attendanceFindAll = vi.mocked(attendanceRepository.findAll);
const attendanceFindById = vi.mocked(attendanceRepository.findById);
const attendanceUpdate = vi.mocked(attendanceRepository.update);
const upsertMany = vi.mocked(attendanceRepository.upsertMany);
const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const findSubjectById = vi.mocked(lessonRepository.findSubjectById);
const userFindAll = vi.mocked(userRepository.findAll);

const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const LESSON_ID = 'lesson-1';

beforeEach(() => {
  vi.clearAllMocks();
  getDefaultId.mockResolvedValue('academy-1');
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  attendanceFindAll.mockResolvedValue([] as never);
  upsertMany.mockResolvedValue([] as never);
  findSubjectById.mockResolvedValue({ teacherId: teacher.userId, groupId: OWN_GROUP } as never);
  userFindAll.mockResolvedValue([{ id: 'student-1' }] as never);
});

describe('getAttendance', () => {
  it('вимагає хоча б один фільтр', async () => {
    await expect(attendanceService.getAttendance({}, teacher)).rejects.toThrow(BadRequestError);
  });

  it('не показує явку неіснуючого заняття', async () => {
    findSubjectById.mockResolvedValue(null as never);

    await expect(attendanceService.getAttendance({ lessonId: LESSON_ID }, teacher)).rejects.toThrow(
      NotFoundError
    );
  });

  // Побачити явку заняття може лише той, хто має доступ до самого заняття
  it('не показує явку чужого заняття', async () => {
    findSubjectById.mockResolvedValue({ teacherId: 'teacher-9', groupId: 'group-other' } as never);

    await expect(attendanceService.getAttendance({ lessonId: LESSON_ID }, teacher)).rejects.toThrow(
      ForbiddenError
    );
  });

  it('студент бачить лише власну явку попри фільтр у запиті', async () => {
    await attendanceService.getAttendance({ studentId: 'student-9' }, student);

    expect(attendanceFindAll).toHaveBeenCalledWith({ studentId: student.userId });
  });
});

describe('saveBulk', () => {
  const records = [{ studentId: 'student-1', status: AttendanceStatus.PRESENT, note: '' }];

  it('зберігає явку студентів групи заняття', async () => {
    await attendanceService.saveBulk({ lessonId: LESSON_ID, records }, teacher);

    expect(upsertMany).toHaveBeenCalledWith('academy-1', LESSON_ID, records);
  });

  it('викладач не відмічає явку за чуже заняття', async () => {
    findSubjectById.mockResolvedValue({ teacherId: 'teacher-9', groupId: OWN_GROUP } as never);

    await expect(
      attendanceService.saveBulk({ lessonId: LESSON_ID, records }, teacher)
    ).rejects.toThrow(ForbiddenError);
  });

  // Не даємо відмітити чужих студентів: усі мають бути з групи цього заняття
  it('відхиляє записи студентів не з цієї групи', async () => {
    const withForeign = [
      ...records,
      { studentId: 'student-9', status: AttendanceStatus.ABSENT, note: '' },
    ];

    await expect(
      attendanceService.saveBulk({ lessonId: LESSON_ID, records: withForeign }, teacher)
    ).rejects.toThrow(BadRequestError);
    expect(upsertMany).not.toHaveBeenCalled();
  });
});

describe('assertGroupStudents', () => {
  it('звіряє записи з активними студентами групи', async () => {
    await assertGroupStudents(OWN_GROUP, [
      { studentId: 'student-1', status: AttendanceStatus.PRESENT, note: '' },
    ]);

    expect(userFindAll).toHaveBeenCalledWith({
      role: UserRole.STUDENT,
      groupId: OWN_GROUP,
      isActive: true,
    });
  });

  // Заняття можна провести без явки — тоді й перевіряти нема кого
  it('без записів не робить запиту', async () => {
    await assertGroupStudents(OWN_GROUP, []);

    expect(userFindAll).not.toHaveBeenCalled();
  });
});

describe('updateStatus', () => {
  beforeEach(() => {
    attendanceFindById.mockResolvedValue({ id: 'att-1', lessonId: LESSON_ID } as never);
  });

  it('не оновлює неіснуючий запис', async () => {
    attendanceFindById.mockResolvedValue(null as never);

    await expect(
      attendanceService.updateStatus('att-1', { status: AttendanceStatus.LATE }, teacher)
    ).rejects.toThrow(NotFoundError);
  });

  it('оновлює лише передані поля', async () => {
    await attendanceService.updateStatus('att-1', { note: 'Запізнився' }, teacher);

    expect(attendanceUpdate).toHaveBeenCalledWith('att-1', { note: 'Запізнився' });
  });

  it('студент не змінює явку', async () => {
    await expect(
      attendanceService.updateStatus('att-1', { status: AttendanceStatus.PRESENT }, student)
    ).rejects.toThrow(ForbiddenError);
  });
});
