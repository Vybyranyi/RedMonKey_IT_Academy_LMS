import { GradeType } from '@redmonkey/shared';
import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BulkGradeForm from '../BulkGradeForm';

const students = [
  { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  { id: 'student-2', firstName: 'Богдан', lastName: 'Мельник' },
] as IUser[];
const lessons = [
  { id: 'lesson-1', title: 'Вступ', date: '2026-09-01T10:00:00.000Z' },
] as IPopulatedLesson[];

const renderForm = (onSubmit = vi.fn()) =>
  render(
    <BulkGradeForm
      isOpen
      onClose={vi.fn()}
      lessons={lessons}
      students={students}
      initialType={GradeType.HOMEWORK}
      isSubmitting={false}
      onSubmit={onSubmit}
    />
  );

describe('BulkGradeForm', () => {
  it('стартує з типу журналу', () => {
    renderForm();
    expect(screen.getByRole('combobox', { name: 'Тип оцінки' })).toHaveTextContent(
      'Домашня робота'
    );
  });

  // Раніше помилка стояла під довгим списком, а рядок з неправильною оцінкою не підсвічувався
  it('підсвічує саме недійсні оцінки й показує помилку біля кнопки', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.type(screen.getByLabelText('Оцінка для Анна Коваленко'), '9');
    await userEvent.type(screen.getByLabelText('Оцінка для Богдан Мельник'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти все' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Оцінка має бути цілим числом від 1 до 12');
    expect(screen.getByLabelText('Оцінка для Богдан Мельник')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByLabelText('Оцінка для Анна Коваленко')).not.toHaveAttribute('aria-invalid');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('«Очистити» стирає і оцінки, і поле «Поставити всім»', async () => {
    renderForm();
    const fill = screen.getByLabelText('Поставити всім');

    await userEvent.type(fill, '10');
    expect(screen.getByLabelText('Оцінка для Анна Коваленко')).toHaveValue(10);

    await userEvent.click(screen.getByRole('button', { name: 'Очистити' }));

    expect(fill).toHaveValue(null);
    expect(screen.getByLabelText('Оцінка для Анна Коваленко')).toHaveValue(null);
  });
});
