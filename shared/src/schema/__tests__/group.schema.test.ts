import { describe, expect, it } from 'vitest';
import { createGroupSchema, updateGroupSchema } from '../group.schema';
import { UUID, firstIssue } from './fixtures';

describe('createGroupSchema', () => {
  // Саме таке тіло шле GroupForm, коли дати не заповнені
  it('перетворює порожні дати з форми на null', () => {
    const data = createGroupSchema.parse({
      name: 'JS-2026-A',
      description: '',
      startDate: '',
      endDate: '',
      teachers: [],
      students: [],
    });

    expect(data).toEqual({
      name: 'JS-2026-A',
      description: '',
      startDate: null,
      endDate: null,
      teachers: [],
    });
  });

  // <input type="date"> дає 'YYYY-MM-DD' — Prisma такий рядок не приймає, Date — приймає
  it('перетворює дату з <input type="date"> на Date', () => {
    const data = createGroupSchema.parse({ name: 'JS-2026-A', startDate: '2026-09-01' });

    expect(data.startDate).toEqual(new Date('2026-09-01T00:00:00.000Z'));
  });

  it('відкидає id, academyId, isActive і students', () => {
    const data = createGroupSchema.parse({
      name: 'JS-2026-A',
      id: UUID.group,
      academyId: UUID.group,
      isActive: false,
      students: [UUID.student],
    });

    expect(data).toEqual({ name: 'JS-2026-A', teachers: [] });
  });

  it('обрізає пробіли в назві', () => {
    expect(createGroupSchema.parse({ name: '  JS-2026-A ' }).name).toBe('JS-2026-A');
  });

  it.each([
    [{ name: undefined }, 'Потрібно вказати назву групи'],
    [{ name: 'JS' }, 'Назва групи має містити не менше 3 символів'],
    [{ name: 'x'.repeat(101) }, 'Назва групи не може бути довшою за 100 символів'],
    [{ description: 'x'.repeat(501) }, 'Опис групи не може бути довшим за 500 символів'],
    [{ startDate: 'завтра' }, 'Дата початку: некоректна дата'],
    [{ teachers: UUID.teacher }, 'teachers має бути масивом'],
    [{ teachers: ['teacher-1'] }, 'teachers: кожен елемент має бути UUID викладача'],
    [{ teachers: [UUID.teacher, UUID.teacher] }, 'У teachers є повторювані id'],
  ])('відхиляє %o', (patch, message) => {
    expect(firstIssue(createGroupSchema.safeParse({ name: 'JS-2026-A', ...patch }))).toBe(message);
  });

  it('відхиляє дату завершення, не пізнішу за дату початку', () => {
    const result = createGroupSchema.safeParse({
      name: 'JS-2026-A',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
    });

    expect(firstIssue(result)).toBe('Дата завершення має бути пізніше за дату початку');
  });
});

describe('updateGroupSchema', () => {
  it('приймає часткове оновлення', () => {
    expect(updateGroupSchema.parse({ description: 'Новий опис' })).toEqual({
      description: 'Новий опис',
    });
  });

  it('дозволяє очистити дату через null', () => {
    expect(updateGroupSchema.parse({ endDate: null })).toEqual({ endDate: null });
  });

  it('відхиляє тіло без жодного дозволеного поля', () => {
    const result = updateGroupSchema.safeParse({ isActive: false, academyId: UUID.group });

    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });

  it('перевіряє порядок дат, якщо обидві прийшли в запиті', () => {
    const result = updateGroupSchema.safeParse({ startDate: '2026-09-01', endDate: '2026-06-01' });

    expect(firstIssue(result)).toBe('Дата завершення має бути пізніше за дату початку');
  });
});
