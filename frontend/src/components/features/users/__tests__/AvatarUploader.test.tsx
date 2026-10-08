import type { IUser } from '@redmonkey/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callsTo, deferred, httpError, installApi } from '../../../../test/apiMock';
import AvatarUploader from '../AvatarUploader';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const user = { id: 'u-1', firstName: 'Олег', lastName: 'Петренко', avatar: null } as IUser;
const withAvatar = {
  ...user,
  avatar: 'https://ref.supabase.co/storage/v1/object/public/avatars/u-1/a.webp',
};

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

// applyAccept: false — інакше user-event сам відкидає файли поза accept, і перевірку
// компонента не видно; у браузері «Усі файли» в діалозі вибору теж дає обійти accept
const setup = () => userEvent.setup({ applyAccept: false });
const input = () => screen.getByTestId('avatar-input') as HTMLInputElement;

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  // У jsdom немає URL.createObjectURL — прев'ю вибраного файлу
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AvatarUploader', () => {
  it('завантажує фото й віддає відповідь сервера сторінці', async () => {
    const response = deferred<IUser>();
    const adapter = installApi({ 'PUT /users/u-1/avatar': () => response.promise });
    const onChange = vi.fn();
    render(<AvatarUploader user={user} onChange={onChange} />);

    await setup().upload(input(), file('me.jpg', 'image/jpeg'));

    // Поки «сервер» думає — кнопка зайнята, другий файл не вибрати
    expect(screen.getByRole('button', { name: /Збереження/ })).toBeDisabled();
    const [config] = callsTo(adapter, 'PUT', '/users/u-1/avatar');
    expect((config.data as FormData).get('avatar')).toBeInstanceOf(File);

    response.resolve({ ...withAvatar } as IUser);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(withAvatar));
    expect(toast.success).toHaveBeenCalledWith('Фото оновлено');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('файл понад 5 МБ відхиляє ще до запиту', async () => {
    const adapter = installApi({});
    render(<AvatarUploader user={user} onChange={vi.fn()} />);

    await setup().upload(input(), file('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1));

    expect(screen.getByRole('alert')).toHaveTextContent('Файл завеликий (максимум 5 МБ)');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('не-картинку відхиляє ще до запиту', async () => {
    const adapter = installApi({});
    render(<AvatarUploader user={user} onChange={vi.fn()} />);

    await setup().upload(input(), file('cv.pdf', 'application/pdf'));

    expect(screen.getByRole('alert')).toHaveTextContent('Підтримуються лише JPG, PNG або WebP');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('при відмові сервера показує toast і не змінює аватарку', async () => {
    installApi({
      'PUT /users/u-1/avatar': (config) => {
        throw httpError(config, 400, 'Файл не є зображенням');
      },
    });
    const onChange = vi.fn();
    render(<AvatarUploader user={user} onChange={onChange} />);

    await setup().upload(input(), file('me.png', 'image/png'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Файл не є зображенням', expect.anything())
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Завантажити фото/ })).toBeEnabled();
  });

  it('без фото кнопки «Видалити» немає', () => {
    installApi({});
    render(<AvatarUploader user={user} onChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Видалити фото/ })).not.toBeInTheDocument();
  });

  it('видаляє фото лише після підтвердження', async () => {
    const adapter = installApi({ 'DELETE /users/u-1/avatar': () => ({ ...user }) });
    const onChange = vi.fn();
    render(<AvatarUploader user={withAvatar as IUser} onChange={onChange} isOwn={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Видалити фото/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Замість фото користувача Олег Петренко');
    expect(adapter).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole('button', { name: 'Видалити фото' }).at(-1)!);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(user));
    expect(toast.success).toHaveBeenCalledWith('Фото видалено');
  });
});
