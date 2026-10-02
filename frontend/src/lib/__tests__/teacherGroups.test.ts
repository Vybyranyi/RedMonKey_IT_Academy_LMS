import type { IPopulatedGroup, IUser } from '@redmonkey/shared';
import { describe, expect, it } from 'vitest';
import { summarizeTeacherGroups } from '../teacherGroups';

const person = (id: string) => ({ id }) as IUser;
const group = (id: string, teacherIds: string[], studentsCount: number) =>
  ({
    id,
    name: id.toUpperCase(),
    teachers: teacherIds.map(person),
    students: Array.from({ length: studentsCount }, (_, i) => person(`${id}-s${i}`)),
  }) as IPopulatedGroup;

describe('summarizeTeacherGroups', () => {
  it('збирає групи викладача й сумує студентів по них', () => {
    const summary = summarizeTeacherGroups([
      group('js-1', ['t-1'], 12),
      group('js-2', ['t-1', 't-2'], 8),
      group('py-1', ['t-2'], 5),
    ]);

    expect(summary.get('t-1')).toEqual({
      groups: [
        { id: 'js-1', name: 'JS-1' },
        { id: 'js-2', name: 'JS-2' },
      ],
      studentsCount: 20,
    });
    expect(summary.get('t-2')?.studentsCount).toBe(13);
  });

  it('викладача без груп у зведенні немає — сторінка підставляє порожнє', () => {
    expect(summarizeTeacherGroups([group('js-1', [], 3)]).size).toBe(0);
  });
});
