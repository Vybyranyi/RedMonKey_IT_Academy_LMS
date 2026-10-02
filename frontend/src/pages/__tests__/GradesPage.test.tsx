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

describe('GradesPage — журнал одного типу', () => {
  // На заняття в студента може бути по оцінці кожного типу, а клітинка вміщає одну:
  // у режимі «Усі типи» журнал показував випадкову з них
  it('викладач і адмін бачать журнал «Класної роботи», і нова оцінка отримує саме цей тип', async () => {
    const adapter = installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [],
      'POST /grades': () => savedGrade,
    });
    renderPage();

    expect(await screen.findByText('Класна робота · 1 студент')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Тип оцінок' })).toHaveTextContent('Класна робота');
    await waitFor(() =>
      expect(callsTo(adapter, 'GET', '/grades')[0]?.params).toMatchObject({
        groupId: 'group-1',
        type: GradeType.CLASSWORK,
      })
    );

    await enterGrade('9');

    await waitFor(() => expect(callsTo(adapter, 'POST', '/grades')).toHaveLength(1));
    expect(JSON.parse(callsTo(adapter, 'POST', '/grades')[0].data).type).toBe(GradeType.CLASSWORK);
    // Середнє рахується лише з цього типу — і підписано відповідно
    expect(screen.getByRole('columnheader', { name: /Середнє/ })).toHaveTextContent(
      'Класна робота'
    );
  });

  it('студент за замовчуванням бачить усі свої оцінки', async () => {
    useAuthStore.getState().setAuth(student, 'token');
    const adapter = installApi({ 'GET /grades': () => [] });
    renderPage();

    expect(await screen.findByRole('combobox', { name: 'Тип оцінок' })).toHaveTextContent(
      'Усі типи'
    );
    await waitFor(() => expect(callsTo(adapter, 'GET', '/grades')).toHaveLength(1));
    expect(callsTo(adapter, 'GET', '/grades')[0].params.type).toBeUndefined();
  });
});

describe('GradesPage — видалення оцінки', () => {
  // DELETE /grades/:id дозволений лише адміну: викладач раніше бачив кошик і ловив 403
  it('викладач не бачить кнопки видалення', async () => {
    useAuthStore.getState().setAuth(teacher, 'token');
    installApi({
      '/groups': () => [{ ...group, teachers: [{ id: 'teacher-1' }] }],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [savedGrade],
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /оцінка 9$/ }));

    expect(await screen.findByRole('button', { name: 'Зберегти' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Видалити оцінку' })).not.toBeInTheDocument();
  });

  it('після видалення toast пропонує «Скасувати», і воно повертає ту саму оцінку', async () => {
    vi.mocked(toast.success).mockClear();
    const adapter = installApi({
      '/groups': () => [group],
      '/users': () => [student],
      '/lessons': () => [lesson],
      'GET /grades': () => [{ ...savedGrade, comment: 'Добре' }],
      'DELETE /grades/grade-1': () => ({ message: 'ok' }),
      'POST /grades': () => ({ ...savedGrade, id: 'grade-2', comment: 'Добре' }),
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /оцінка 9$/ }));
    await user.click(await screen.findByRole('button', { name: 'Видалити оцінку' }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Оцінку 9 видалено',
        expect.objectContaining({ action: expect.objectContaining({ label: 'Скасувати' }) })
      )
    );
    expect(screen.getByRole('button', { name: /виставити оцінку/ })).toBeInTheDocument();

    const [, options] = vi.mocked(toast.success).mock.calls[0] as [
      string,
      { action: { onClick: () => void } },
    ];
    options.action.onClick();

    expect(await screen.findByRole('button', { name: /оцінка 9$/ })).toBeInTheDocument();
    const [restore] = callsTo(adapter, 'POST', '/grades');
    expect(JSON.parse(restore.data)).toEqual({
      studentId: 'student-1',
      lessonId: 'lesson-1',
      value: 9,
      comment: 'Добре',
      type: GradeType.CLASSWORK,
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Оцінку відновлено'));
  });
});
