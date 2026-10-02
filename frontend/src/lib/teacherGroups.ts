import type { IGroup, IPopulatedGroup } from '@redmonkey/shared';

export interface TeacherGroupsSummary {
  groups: Pick<IGroup, 'id' | 'name'>[];
  studentsCount: number;
}

export const EMPTY_TEACHER_SUMMARY: TeacherGroupsSummary = { groups: [], studentsCount: 0 };

/**
 * Бекенд не віддає в /users групи викладача, зате GET /groups уже містить склад
 * кожної групи. Студент належить рівно одній групі (User.groupId), тож сума
 * студентів по групах викладача не рахує нікого двічі.
 */
export const summarizeTeacherGroups = (
  groups: IPopulatedGroup[]
): Map<string, TeacherGroupsSummary> => {
  const byTeacher = new Map<string, TeacherGroupsSummary>();
  groups.forEach((group) => {
    group.teachers.forEach((teacher) => {
      const summary = byTeacher.get(teacher.id) ?? { groups: [], studentsCount: 0 };
      byTeacher.set(teacher.id, {
        groups: [...summary.groups, { id: group.id, name: group.name }],
        studentsCount: summary.studentsCount + group.students.length,
      });
    });
  });
  return byTeacher;
};
