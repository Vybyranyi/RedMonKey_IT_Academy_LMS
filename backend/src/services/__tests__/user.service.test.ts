import { UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupRepository } from '../../repositories/group.repository.js';
import { statsRepository } from '../../repositories/stats.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { userService } from '../user.service.js';

vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));
vi.mock('../../repositories/stats.repository.js', () => ({
  statsRepository: { averageGrades: vi.fn(), attendanceRates: vi.fn() },
}));
vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findAll: vi.fn() },
}));

const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const averageGrades = vi.mocked(statsRepository.averageGrades);
const attendanceRates = vi.mocked(statsRepository.attendanceRates);
const findAll = vi.mocked(userRepository.findAll);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };

const OWN_GROUP = 'group-own';
const OTHER_GROUP = 'group-other';

const user = (id: string, role: UserRole, groupId: string | null) =>
  ({ id, role, groupId, firstName: 'Імʼя', lastName: 'Прізвище', isActive: true }) as never;

const anna = user('student-1', UserRole.STUDENT, OWN_GROUP);
const bohdan = user('student-2', UserRole.STUDENT, OTHER_GROUP);
const olha = user('teacher-2', UserRole.TEACHER, null);

beforeEach(() => {
  vi.clearAllMocks();
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
  averageGrades.mockResolvedValue(new Map([['student-1', 8.67]]));
  attendanceRates.mockResolvedValue(new Map([['student-1', 90]]));
});

describe('userService.getUsers — withStats', () => {
  // Дашборд, форми й журнал теж просять /users — вони за агрегати не платять
  it('без withStats не рахує статистику і віддає список як є', async () => {
    findAll.mockResolvedValue([anna]);

    const users = await userService.getUsers({}, admin);

    expect(users).toEqual([anna]);
    expect(averageGrades).not.toHaveBeenCalled();
    expect(attendanceRates).not.toHaveBeenCalled();
  });

  it('рахує бал і відвідуваність усіх студентів двома запитами на весь список', async () => {
    findAll.mockResolvedValue([anna, bohdan]);

    const users = await userService.getUsers({ withStats: true }, admin);

    expect(averageGrades).toHaveBeenCalledTimes(1);
    expect(averageGrades).toHaveBeenCalledWith(['student-1', 'student-2']);
    expect(attendanceRates).toHaveBeenCalledWith(['student-1', 'student-2']);
    expect(users.map((row) => ('stats' in row ? row.stats : undefined))).toEqual([
      { averageGrade: 8.67, attendanceRate: 90 },
      // Оцінок і явки ще немає — null, а не 0
      { averageGrade: null, attendanceRate: null },
    ]);
  });

  it('не-студентам stats не рахує', async () => {
    findAll.mockResolvedValue([anna, olha]);

    const users = await userService.getUsers({ withStats: true }, admin);

    expect(averageGrades).toHaveBeenCalledWith(['student-1']);
    expect(users[1]).toMatchObject({ id: 'teacher-2', stats: null });
  });

  // Матриця прав (ТЗ 2): список студентів — увесь, статистика — лише своїх груп
  it('викладачу віддає статистику лише студентів своїх груп', async () => {
    findAll.mockResolvedValue([anna, bohdan]);

    const users = await userService.getUsers({ withStats: true }, teacher);

    expect(averageGrades).toHaveBeenCalledWith(['student-1']);
    expect(attendanceRates).toHaveBeenCalledWith(['student-1']);
    expect(users).toMatchObject([
      { id: 'student-1', stats: { averageGrade: 8.67, attendanceRate: 90 } },
      { id: 'student-2', stats: null },
    ]);
  });

  it('не йде в БД за агрегатами, якщо жодного студента не видно', async () => {
    findAll.mockResolvedValue([bohdan]);

    const users = await userService.getUsers({ withStats: true }, teacher);

    expect(averageGrades).not.toHaveBeenCalled();
    expect(attendanceRates).not.toHaveBeenCalled();
    expect(users).toMatchObject([{ id: 'student-2', stats: null }]);
  });
});
