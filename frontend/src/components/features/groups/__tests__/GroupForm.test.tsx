import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installApi } from '../../../../test/apiMock';
import GroupForm from '../GroupForm';

beforeEach(() => {
  installApi({ '/users': () => [] });
});

const fill = async (startDate: string, endDate: string) => {
  await userEvent.type(screen.getByLabelText('Назва групи *'), 'JS-2026-A');
  fireEvent.change(screen.getByLabelText('Дата початку'), { target: { value: startDate } });
  fireEvent.change(screen.getByLabelText('Дата завершення'), { target: { value: endDate } });
  await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));
};

describe('GroupForm — дати', () => {
  // Раніше таку групу відхиляв лише бекенд — після відправки форми
  it('не дає завершити групу раніше, ніж вона почалась', async () => {
    const onSubmit = vi.fn();
    render(<GroupForm onSubmit={onSubmit} isSubmitting={false} />);

    await fill('2026-09-01', '2026-06-01');

    expect(
      await screen.findByText('Дата завершення має бути пізніше за дату початку')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('коректні дати пропускає', async () => {
    const onSubmit = vi.fn();
    render(<GroupForm onSubmit={onSubmit} isSubmitting={false} />);

    await fill('2026-09-01', '2027-06-01');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
