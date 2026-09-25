import type { IPopulatedGrade } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GradeCell from '../GradeCell';

const grade = {
  id: 'grade-1',
  value: 11,
  comment: 'Добре',
  createdAt: '2026-09-01T10:00:00.000Z',
  teacher: { firstName: 'Олег', lastName: 'Петренко' },
} as IPopulatedGrade;

describe('режим перегляду', () => {
  it('показує оцінку', () => {
    render(<GradeCell grade={grade} editable={false} onSave={vi.fn()} />);

    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('показує прочерк, коли оцінки немає', () => {
    render(<GradeCell grade={null} editable={false} onSave={vi.fn()} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('не дає редагувати — кнопки немає', () => {
    render(<GradeCell grade={grade} editable={false} onSave={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('режим редагування', () => {
  it('порожня клітинка запрошує виставити оцінку', () => {
    render(<GradeCell grade={null} editable onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  it('під час збереження блокує клітинку', () => {
    render(<GradeCell grade={grade} editable isSaving onSave={vi.fn()} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('зберігає введену оцінку з коментарем', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '9');
    await user.type(screen.getByLabelText('Коментар'), '  Активний  ');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(onSave).toHaveBeenCalledWith(9, 'Активний');
  });

  // Діапазон 1..12 перевіряється і тут: інакше бекенд поверне 400 вже після кліку
  it('не пускає оцінку поза діапазоном', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '13');
    await user.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Оцінка має бути цілим числом від 1 до 12')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('підставляє наявну оцінку у форму редагування', async () => {
    const user = userEvent.setup();
    render(<GradeCell grade={grade} editable onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '11' }));

    expect(await screen.findByLabelText(/Оцінка/)).toHaveValue(11);
    expect(screen.getByLabelText('Коментар')).toHaveValue('Добре');
  });

  it('видаляє оцінку через кнопку у поповері', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={grade} editable onSave={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: '11' }));
    await user.click(await screen.findByRole('button', { name: 'Видалити оцінку' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('клавіатура (ТЗ 6.4)', () => {
  it('Enter зберігає оцінку', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '9{Enter}');

    expect(onSave).toHaveBeenCalledWith(9, '');
    expect(screen.queryByLabelText(/Оцінка/)).not.toBeInTheDocument();
  });

  it('Tab після введення оцінки теж зберігає', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '7');
    await user.tab();

    expect(onSave).toHaveBeenCalledWith(7, '');
  });

  // Інакше коментар до вже виставленої оцінки з клавіатури не додати
  it('Tab по незміненій оцінці веде на коментар, нічого не зберігаючи', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={grade} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '11' }));
    await screen.findByLabelText(/Оцінка/);
    await user.tab();

    expect(screen.getByLabelText('Коментар')).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Коментар'));
    await user.type(screen.getByLabelText('Коментар'), 'Молодець{Enter}');
    expect(onSave).toHaveBeenCalledWith(11, 'Молодець');
  });

  it('Escape закриває без збереження й повертає фокус на клітинку', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '5{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/Оцінка/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+' })).toHaveFocus();
  });

  it('невалідна оцінка по Tab не зберігається і лишає фокус у полі', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GradeCell grade={null} editable onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: '+' }));
    await user.type(await screen.findByLabelText(/Оцінка/), '15');
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('від 1 до 12');
    expect(screen.getByLabelText(/Оцінка/)).toHaveFocus();
  });

  it('має назву для скрінрідера: хто, яке заняття і яка оцінка', () => {
    render(
      <GradeCell grade={grade} editable onSave={vi.fn()} cellLabel="Анна Коваленко, 1 вер." />
    );

    expect(
      screen.getByRole('button', { name: 'Анна Коваленко, 1 вер.: оцінка 11' })
    ).toBeInTheDocument();
  });
});
