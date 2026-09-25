import { CoinCategory, GradeType, UserRole } from '@redmonkey/shared';
import type {
  IPopulatedCoinTransaction,
  IPopulatedGrade,
  IStudentListStats,
  IUserWithListStats,
} from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { callsTo, httpError, installApi } from '../../../../test/apiMock';
import StudentDetailsModal from '../StudentDetailsModal';

const student = (stats: IStudentListStats | null): IUserWithListStats => ({
  id: 'student-1',
  firstName: 'Анна',
  lastName: 'Коваленко',
  email: 'anna@academy.ua',
  role: UserRole.STUDENT,
  redCoins: 40,
  isActive: true,
  group: { id: 'group-1', name: 'JS-1' },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  stats,
});

const visible = student({ averageGrade: 8, attendanceRate: 90 });

const grade = (n: number, value: number): IPopulatedGrade => ({
  id: `grade-${n}`,
  studentId: 'student-1',
  lessonId: `lesson-${n}`,
  teacherId: 'teacher-1',
  value,
  type: GradeType.CLASSWORK,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  student: { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  lesson: { id: `lesson-${n}`, title: `Заняття ${n}`, date: `2026-09-${10 + n}T10:00:00.000Z` },
  teacher: { id: 'teacher-1', firstName: 'Олег', lastName: 'Викладач' },
});

const transaction: IPopulatedCoinTransaction = {
  id: 'tx-1',
  studentId: 'student-1',
  issuedBy: 'teacher-1',
  amount: 50,
  reason: 'Активність на занятті',
  category: CoinCategory.ACTIVITY,
  createdAt: '2026-09-15T10:00:00.000Z',
  student: { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  issuer: { id: 'teacher-1', firstName: 'Олег', lastName: 'Викладач' },
};

const renderModal = (target: IUserWithListStats) =>
  render(<StudentDetailsModal student={target} isOpen onClose={vi.fn()} />);

describe('StudentDetailsModal — оцінки й транзакції', () => {
  it('показує справжні оцінки й транзакції студента', async () => {
    const api = installApi({
      '/grades': () => [grade(1, 11), grade(2, 5)],
      '/coins/transactions': () => ({ items: [transaction], nextCursor: null }),
    });

    renderModal(visible);

    expect(await screen.findByText('Заняття 1')).toBeInTheDocument();
    // Колір — за шкалою оцінок, а не завжди зелений: 11 — зелений, 5 — жовтий
    expect(screen.getByText('11')).toHaveClass('bg-emerald-100');
    expect(screen.getByText('5')).toHaveClass('bg-amber-100');
    expect(screen.getByText('Активність на занятті')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(callsTo(api, 'GET', '/grades')[0]?.params).toEqual({ studentId: 'student-1' });
    expect(callsTo(api, 'GET', '/coins/transactions')[0]?.params).toEqual({
      studentId: 'student-1',
      limit: 5,
    });
  });

  it('показує найсвіжіші оцінки першими й не більше шести', async () => {
    installApi({
      '/grades': () => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => grade(n, 10)),
      '/coins/transactions': () => ({ items: [], nextCursor: null }),
    });

    renderModal(visible);

    await screen.findByText('Заняття 8');
    const titles = screen.getAllByText(/^Заняття \d$/).map((node) => node.textContent);
    expect(titles).toEqual([
      'Заняття 8',
      'Заняття 7',
      'Заняття 6',
      'Заняття 5',
      'Заняття 4',
      'Заняття 3',
    ]);
    expect(screen.getByText('останні 6 із 8')).toBeInTheDocument();
  });

  it('студенту без оцінок і транзакцій показує порожні стани', async () => {
    installApi({
      '/grades': () => [],
      '/coins/transactions': () => ({ items: [], nextCursor: null }),
    });

    renderModal(visible);

    expect(await screen.findByText('Оцінки ще не виставлені')).toBeInTheDocument();
    expect(screen.getByText('Історія транзакцій порожня')).toBeInTheDocument();
  });

  // Для чужого студента API не дає 403, а звужує вибірку — порожня історія була б неправдою
  it('студента чужої групи не запитує, а пояснює, чому даних немає', () => {
    const api = installApi({});

    renderModal(student(null));

    expect(
      screen.getByText('Оцінки й історію RedCoins видно лише для студентів ваших груп')
    ).toBeInTheDocument();
    expect(screen.queryByText('Історія транзакцій порожня')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('збій завантаження показує помилку з повтором', async () => {
    let fail = true;
    installApi({
      '/grades': (config) => {
        if (fail) throw httpError(config, 500, 'Сервер недоступний');
        return [grade(1, 9)];
      },
      '/coins/transactions': () => ({ items: [], nextCursor: null }),
    });

    renderModal(visible);

    expect(await screen.findByText('Сервер недоступний')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Спробувати знову' }));

    expect(await screen.findByText('Заняття 1')).toBeInTheDocument();
    expect(screen.queryByText('Сервер недоступний')).not.toBeInTheDocument();
  });
});
