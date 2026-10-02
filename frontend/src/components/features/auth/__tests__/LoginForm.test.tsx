import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../LoginForm';

const renderForm = () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<LoginForm onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
};

const submit = () => screen.getByRole('button', { name: 'Увійти' });

describe('LoginForm', () => {
  it('показує помилки валідації для порожньої форми', async () => {
    const { onSubmit, user } = renderForm();

    await user.click(submit());

    expect(await screen.findByText('Пароль має містити не менше 6 символів')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('показує помилку для некоректного email', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(submit());

    expect(await screen.findByText('Некоректний формат email')).toBeInTheDocument();
  });

  it('передає коректні дані в onSubmit', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Email'), 'admin@academy.com');
    await user.type(screen.getByLabelText('Пароль'), 'secret123');
    await user.click(submit());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { email: 'admin@academy.com', password: 'secret123' },
        expect.anything()
      );
    });
  });

  it('ховає пароль за замовчуванням і показує за кліком', async () => {
    const { user } = renderForm();
    const password = screen.getByLabelText('Пароль');

    expect(password).toHaveAttribute('type', 'password');

    // Кнопка-око не має підпису, тож беремо її як єдину button типу button у формі
    const toggle = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('type') === 'button') as HTMLElement;
    await user.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
  });
});

describe('LoginForm — доступність', () => {
  // Раніше помилку було видно лише червоною рамкою: скрінрідер її не озвучував
  it('поле з помилкою позначене aria-invalid і пов’язане з текстом помилки', async () => {
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(submit());

    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription('Некоректний формат email');
  });

  it('кнопка «Показати пароль» — праворуч від поля і перемикає видимість', async () => {
    const { user } = renderForm();
    const password = screen.getByLabelText('Пароль');
    const toggle = screen.getByRole('button', { name: 'Показати пароль' });

    // Кнопка йде в DOM після поля — і в порядку Tab, і візуально праворуч
    expect(
      password.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Сховати пароль' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
