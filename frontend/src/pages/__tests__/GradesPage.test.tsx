import { GradeType, UserRole } from '@redmonkey/shared';
import type { IPopulatedGrade, IUser } from '@redmonkey/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { callsTo, deferred, httpError, installApi } from '../../test/apiMock';
import GradesPage from '../GradesPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;
const teacher = {
  id: 'teacher-1',
  role: UserRole.TEACHER,
  firstName: 'Олег',
  lastName: 'Петренко',
} as IUser;
const group = { id: 'group-1', name: 'JS-1', teachers: [], students: [] };
const student = {
  id: 'student-1',
  firstName: 'Анна',
  lastName: 'Коваленко',
  role: UserRole.STUDENT,
} as IUser;
const lesson = {
  id: 'lesson-1',
  title: 'Вступ',
  date: '2026-09-01T10:00:00.000Z',
  groupId: 'group-1',
};

const savedGrade = {
  id: 'grade-1',
  studentId: 'student-1',
  lessonId: 'lesson-1',
  teacherId: 'admin-1',
  value: 9,
  type: GradeType.CLASSWORK,
  comment: '',
  createdAt: '2026-09-01T11:00:00.000Z',
  updatedAt: '2026-09-01T11:00:00.000Z',
  student: { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  lesson: { id: 'lesson-1', title: 'Вступ', date: '2026-09-01T10:00:00.000Z' },
  teacher: { id: 'admin-1', firstName: 'Ірина', lastName: 'Адміненко' },
} as IPopulatedGrade;

const renderPage = () =>
  render(
    <MemoryRouter>
      <GradesPage />
    </MemoryRouter>
  );

/** Відкрити порожню клітинку, ввести оцінку і натиснути «Зберегти» */
const enterGrade = async (value: string) => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /виставити оцінку/ }));
  await user.type(await screen.findByLabelText(/Оцінка/), value);
  await user.click(screen.getByRole('button', { name: 'Зберегти' }));
};

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  // setAuth ще й скидає кеш груп між тестами
  useAuthStore.getState().setAuth(admin, 'token');
});

describe('GradesPage — оптимістичне збереження оцінки', () => {
  it('показує оцінку й середнє одразу, до відповіді сервера, і не перезапитує журнал', async () => {
    const post = deferred();
    const adapter = installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [],
      'POST /grades': () => post.promise,
    });
    renderPage();

    await enterGrade('9');

    // Сервер ще не відповів, а оцінка вже в клітинці (заблокованій до підтвердження)
    expect(screen.getByRole('button', { name: /оцінка 9$/ })).toBeDisabled();
    expect(screen.getByText('9.0')).toBeInTheDocument();

    post.resolve(savedGrade);

    await waitFor(() => expect(screen.getByRole('button', { name: /оцінка 9$/ })).toBeEnabled());
    expect(callsTo(adapter, 'GET', '/grades')).toHaveLength(1);
    expect(callsTo(adapter, 'GET', '/users')).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('відкочує клітинку й показує причину, якщо сервер відмовив', async () => {
    installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [],
      'POST /grades': (config) => {
        throw httpError(config, 400, 'Студент не належить до групи цього заняття');
      },
    });
    renderPage();

    await enterGrade('9');

    expect(await screen.findByRole('button', { name: /виставити оцінку/ })).toBeEnabled();
    expect(screen.queryByText('9.0')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(
      'Студент не належить до групи цього заняття',
      expect.anything()
    );
  });

  it('видаляє оцінку одразу і повертає її, якщо видалення не вдалося', async () => {
    const remove = deferred();
    installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [savedGrade],
      'DELETE /grades/grade-1': () => remove.promise,
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /оцінка 9$/ }));
    await user.click(await screen.findByRole('button', { name: 'Видалити оцінку' }));

    expect(await screen.findByRole('button', { name: /виставити оцінку/ })).toBeInTheDocument();

    remove.reject(new Error('Network Error'));

    expect(await screen.findByRole('button', { name: /оцінка 9$/ })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('GradesPage — порожні стани', () => {
  // Раніше викладач без груп бачив вічний скелетон: groupId лишався порожнім
  it('викладачу без груп пояснює, чому журналу немає', async () => {
    useAuthStore.getState().setAuth(teacher, 'token');
    installApi({ '/groups': () => [{ ...group, teachers: [{ id: 'someone-else' }] }] });

    renderPage();

    expect(await screen.findByText('Ви ще не закріплені за жодною групою')).toBeInTheDocument();
  });

  it('при збої завантаження показує помилку з кнопкою повтору', async () => {
    let fail = true;
    installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': (config) => {
        if (fail) throw httpError(config, 500, 'Внутрішня помилка сервера');
        return [];
      },
    });
    renderPage();

    expect(await screen.findByText('Не вдалося завантажити журнал')).toBeInTheDocument();

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Спробувати знову' }));

    expect(await screen.findByRole('button', { name: /виставити оцінку/ })).toBeInTheDocument();
  });
});
