import { LessonType, UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '../../../../api/cache';
import { useAuthStore } from '../../../../store/authStore';
import { installApi } from '../../../../test/apiMock';
import LessonForm from '../LessonForm';

const teacher = { id: 'teacher-1', role: UserRole.TEACHER, firstName: 'Олег' } as IUser;

const existing = {
  title: 'Вступ до JS',
  description: '',
  groupId: '6f1c1f8e-7a5b-4c1e-9d3a-2b1a0c9d8e7f',
  type: LessonType.LECTURE,
  date: '2026-09-10',
  time: '18:00',
  duration: 80,
  teacherId: '',
  homeworkDescription: 'Задачі 1–5',
  homeworkDue: '',
};

beforeEach(() => {
  clearCache();
  installApi({ '/groups': () => [] });
  useAuthStore.getState().setAuth(teacher, 'token');
});

describe('LessonForm — домашнє завдання', () => {
  it('не дає поставити дедлайн раніше за заняття', async () => {
    const onSubmit = vi.fn();
    render(<LessonForm initialValues={existing} onSubmit={onSubmit} isSubmitting={false} />);

    fireEvent.change(screen.getByLabelText('Здати до'), { target: { value: '2026-09-09' } });
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(
      await screen.findByText('Дедлайн домашнього завдання не може бути раніше заняття')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // «Здати до 12 вересня» — до кінця дня за місцевим часом, а не до його опівночі
  it('шле дедлайн як кінець обраного дня', async () => {
    const onSubmit = vi.fn();
    render(<LessonForm initialValues={existing} onSubmit={onSubmit} isSubmitting={false} />);

    fireEvent.change(screen.getByLabelText('Здати до'), { target: { value: '2026-09-12' } });
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      homeworkDueDate: new Date(2026, 8, 12, 23, 59, 59).toISOString(),
    });
  });

  it('дедлайн у день заняття дозволений', async () => {
    const onSubmit = vi.fn();
    render(<LessonForm initialValues={existing} onSubmit={onSubmit} isSubmitting={false} />);

    fireEvent.change(screen.getByLabelText('Здати до'), { target: { value: '2026-09-10' } });
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
