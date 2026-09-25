import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '../../../../api/cache';
import { installApi } from '../../../../test/apiMock';
import UserForm from '../UserForm';

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText("Ім'я *"), 'Іван');
  await userEvent.type(screen.getByLabelText('Прізвище *'), 'Петренко');
  await userEvent.type(screen.getByLabelText('Email *'), 'ivan@academy.com');
};

beforeEach(() => {
  clearCache();
  installApi({ '/groups': () => [] });
});

describe('UserForm — пароль', () => {
  // Раніше користувач без пароля отримував на бекенді спільний пароль із коду
  it('новому користувачу не дає зберегти без пароля', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} isSubmitting={false} hideRoleSelect />);

    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Вкажіть пароль або згенеруйте його')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('згенерований пароль іде в запит', async () => {
    const onSubmit = vi.fn();
    render(<UserForm onSubmit={onSubmit} isSubmitting={false} hideRoleSelect />);

    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Генерувати Пароль' }));
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0].password).toMatch(/^.{6,}$/);
  });

  it('при редагуванні порожній пароль лишає поточний', async () => {
    const onSubmit = vi.fn();
    render(
      <UserForm
        initialValues={{ firstName: 'Іван', lastName: 'Петренко', email: 'ivan@academy.com' }}
        onSubmit={onSubmit}
        isSubmitting={false}
        hideRoleSelect
        isEdit
      />
    );

    expect(screen.getByLabelText('Новий пароль')).toHaveAttribute('placeholder', 'Не змінювати');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('password');
  });
});
