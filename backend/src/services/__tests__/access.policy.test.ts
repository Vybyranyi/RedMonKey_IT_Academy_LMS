import { UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupRepository } from '../../repositories/group.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import type { TokenPayload } from '../../utils/jwt.js';
import { accessPolicy } from '../access.policy.js';

vi.mock('../../repositories/group.repository.js', () => ({
  groupRepository: { findIdsByTeacher: vi.fn() },
}));

vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: { findById: vi.fn() },
}));

const findIdsByTeacher = vi.mocked(groupRepository.findIdsByTeacher);
const findById = vi.mocked(userRepository.findById);

const admin: TokenPayload = { userId: 'admin-1', role: UserRole.ADMIN };
const teacher: TokenPayload = { userId: 'teacher-1', role: UserRole.TEACHER };
const student: TokenPayload = { userId: 'student-1', role: UserRole.STUDENT };

const OWN_GROUP = 'group-own';
const OTHER_GROUP = 'group-other';

beforeEach(() => {
  vi.clearAllMocks();
  findIdsByTeacher.mockResolvedValue([OWN_GROUP]);
});

describe('canViewUser', () => {
  it('адмін бачить будь-який профіль', async () => {
    const allowed = await accessPolicy.canViewUser(admin, {
      id: 'student-9',
      role: UserRole.STUDENT,
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('користувач завжди бачить власний профіль', async () => {
    const allowed = await accessPolicy.canViewUser(student, {
      id: student.userId,
      role: UserRole.STUDENT,
      groupId: null,
    });
    expect(allowed).toBe(true);
  });

  it('викладач бачить студента своєї групи', async () => {
    const allowed = await accessPolicy.canViewUser(teacher, {
      id: 'student-2',
      role: UserRole.STUDENT,
      groupId: OWN_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('викладач не бачить студента чужої групи', async () => {
    const allowed = await accessPolicy.canViewUser(teacher, {
      id: 'student-2',
      role: UserRole.STUDENT,
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(false);
  });

  it('викладач не бачить студента без групи', async () => {
    const allowed = await accessPolicy.canViewUser(teacher, {
      id: 'student-2',
      role: UserRole.STUDENT,
      groupId: null,
    });
    expect(allowed).toBe(false);
  });

  it('викладач не бачить профіль іншого викладача', async () => {
    const allowed = await accessPolicy.canViewUser(teacher, {
      id: 'teacher-2',
      role: UserRole.TEACHER,
      groupId: null,
    });
    expect(allowed).toBe(false);
  });

  it('студент не бачить чужий профіль', async () => {
    const allowed = await accessPolicy.canViewUser(student, {
      id: 'student-2',
      role: UserRole.STUDENT,
      groupId: OWN_GROUP,
    });
    expect(allowed).toBe(false);
  });
});

describe('canViewGroup', () => {
  const group = { teacherIds: [teacher.userId], studentIds: [student.userId] };

  it('адмін бачить будь-яку групу', async () => {
    expect(await accessPolicy.canViewGroup(admin, { teacherIds: [], studentIds: [] })).toBe(true);
  });

  it('викладач бачить групу, у якій викладає', async () => {
    expect(await accessPolicy.canViewGroup(teacher, group)).toBe(true);
  });

  it('викладач не бачить чужу групу', async () => {
    expect(
      await accessPolicy.canViewGroup(teacher, { teacherIds: ['teacher-9'], studentIds: [] })
    ).toBe(false);
  });

  it('студент бачить власну групу', async () => {
    expect(await accessPolicy.canViewGroup(student, group)).toBe(true);
  });

  it('студент не бачить чужу групу', async () => {
    expect(
      await accessPolicy.canViewGroup(student, { teacherIds: [], studentIds: ['student-9'] })
    ).toBe(false);
  });
});

describe('canViewLesson', () => {
  it('адмін бачить будь-яке заняття', async () => {
    const allowed = await accessPolicy.canViewLesson(admin, {
      teacherId: 'teacher-9',
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('викладач бачить власне заняття навіть у чужій групі', async () => {
    const allowed = await accessPolicy.canViewLesson(teacher, {
      teacherId: teacher.userId,
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('викладач бачить чуже заняття у своїй групі', async () => {
    const allowed = await accessPolicy.canViewLesson(teacher, {
      teacherId: 'teacher-9',
      groupId: OWN_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('викладач не бачить чуже заняття у чужій групі', async () => {
    const allowed = await accessPolicy.canViewLesson(teacher, {
      teacherId: 'teacher-9',
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(false);
  });

  it('студент бачить заняття своєї групи', async () => {
    findById.mockResolvedValue({ groupId: OWN_GROUP } as never);

    const allowed = await accessPolicy.canViewLesson(student, {
      teacherId: 'teacher-9',
      groupId: OWN_GROUP,
    });
    expect(allowed).toBe(true);
  });

  it('студент не бачить заняття чужої групи', async () => {
    findById.mockResolvedValue({ groupId: OWN_GROUP } as never);

    const allowed = await accessPolicy.canViewLesson(student, {
      teacherId: 'teacher-9',
      groupId: OTHER_GROUP,
    });
    expect(allowed).toBe(false);
  });

  it('студента без групи не пускає до занять', async () => {
    findById.mockResolvedValue(null as never);

    const allowed = await accessPolicy.canViewLesson(student, {
      teacherId: 'teacher-9',
      groupId: OWN_GROUP,
    });
    expect(allowed).toBe(false);
  });
});

describe('canManageLesson', () => {
  const lesson = { teacherId: teacher.userId, groupId: OWN_GROUP };

  it('адмін керує будь-яким заняттям', () => {
    expect(accessPolicy.canManageLesson(admin, lesson)).toBe(true);
  });

  it('викладач керує власним заняттям', () => {
    expect(accessPolicy.canManageLesson(teacher, lesson)).toBe(true);
  });

  // Доступ на перегляд заняття своєї групи ще не дає права його редагувати
  it('викладач не керує чужим заняттям', () => {
    expect(
      accessPolicy.canManageLesson(teacher, { teacherId: 'teacher-9', groupId: OWN_GROUP })
    ).toBe(false);
  });

  it('студент не керує заняттями', () => {
    expect(accessPolicy.canManageLesson(student, lesson)).toBe(false);
  });
});

describe('canManageGrade', () => {
  it('адмін керує будь-якою оцінкою', () => {
    expect(accessPolicy.canManageGrade(admin, { teacherId: 'teacher-9' })).toBe(true);
  });

  it('викладач керує оцінкою, яку сам виставив', () => {
    expect(accessPolicy.canManageGrade(teacher, { teacherId: teacher.userId })).toBe(true);
  });

  it('викладач не керує чужою оцінкою', () => {
    expect(accessPolicy.canManageGrade(teacher, { teacherId: 'teacher-9' })).toBe(false);
  });

  it('студент не керує оцінками', () => {
    expect(accessPolicy.canManageGrade(student, { teacherId: student.userId })).toBe(false);
  });
});
