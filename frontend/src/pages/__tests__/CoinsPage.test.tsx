import { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { CoinCategory, UserRole } from '@redmonkey/shared';
import type { ILeaderboardRow, IPopulatedCoinTransaction, IUser } from '@redmonkey/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { callsTo, deferred, httpError, installApi } from '../../test/apiMock';
import CoinsPage from '../CoinsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

/**
 * Мережу підміняє адаптер axios: відповідь залежить від URL і параметрів,
 * тож тест бачить саме ті запити, які сторінка робить до API.
 */
const tx = (n: number): IPopulatedCoinTransaction =>
  ({
    id: `tx-${n}`,
    amount: n,
    reason: `Транзакція ${n}`,
    category: CoinCategory.ACTIVITY,
    createdAt: '2026-09-01T10:00:00.000Z',
    student: { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
    issuer: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
  }) as IPopulatedCoinTransaction;

const reply = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config,
});

const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
  if (config.url === '/coins/transactions') {
    return config.params?.cursor === 'tx-2'
      ? reply(config, { items: [tx(3)], nextCursor: null })
      : reply(config, { items: [tx(1), tx(2)], nextCursor: 'tx-2' });
  }
  if (config.url === '/coins/leaderboard') return reply(config, []);
  if (config.url?.startsWith('/coins/students/')) {
    return reply(config, { studentId: 'student-1', balance: 6, earned: 6, spent: 0 });
  }
  throw new Error(`Неочікуваний запит: ${config.url}`);
});

const historyCalls = () =>
  adapter.mock.calls.filter(([config]) => config.url === '/coins/transactions');

beforeEach(() => {
  adapter.mockClear();
  axiosInstance.defaults.adapter = adapter as never;
  useAuthStore
    .getState()
    .setAuth({ id: 'student-1', role: UserRole.STUDENT, redCoins: 6 } as IUser, 'token');
});

describe('CoinsPage — історія сторінками', () => {
  it('спершу вантажить лише першу сторінку', async () => {
    render(<CoinsPage />);

    expect(await screen.findByText('Транзакція 1')).toBeInTheDocument();
    expect(screen.getByText('Транзакція 2')).toBeInTheDocument();
    expect(historyCalls()).toHaveLength(1);
    expect(historyCalls()[0]?.[0].params).not.toHaveProperty('cursor');
  });

  it('«Показати ще» догружає наступну сторінку за курсором і дописує її в кінець', async () => {
    render(<CoinsPage />);
    await screen.findByText('Транзакція 1');

    await userEvent.click(screen.getByRole('button', { name: 'Показати ще' }));

    expect(await screen.findByText('Транзакція 3')).toBeInTheDocument();
    // Попередні сторінки лишаються — список доповнюється, а не замінюється
    expect(screen.getByText('Транзакція 1')).toBeInTheDocument();
    expect(historyCalls()[1]?.[0].params).toMatchObject({ cursor: 'tx-2' });

    // nextCursor = null — історію вичерпано, кнопка зникає
    expect(screen.queryByRole('button', { name: 'Показати ще' })).not.toBeInTheDocument();
  });
});

describe('CoinsPage — оптимістичне нарахування', () => {
  const ANNA_ID = '11111111-1111-4111-8111-111111111111';
  const BOHDAN_ID = '22222222-2222-4222-8222-222222222222';
  const admin = {
    id: 'admin-1',
    role: UserRole.ADMIN,
    firstName: 'Ірина',
    lastName: 'Адміненко',
  } as IUser;
  const students = [
    { id: ANNA_ID, firstName: 'Анна', lastName: 'Коваленко', redCoins: 10, role: UserRole.STUDENT },
    {
      id: BOHDAN_ID,
      firstName: 'Богдан',
      lastName: 'Мельник',
      redCoins: 15,
      role: UserRole.STUDENT,
    },
  ] as IUser[];
  const leaderboard: ILeaderboardRow[] = [
    {
      position: 1,
      studentId: BOHDAN_ID,
      firstName: 'Богдан',
      lastName: 'Мельник',
      groupName: 'JS-1',
      redCoins: 15,
    },
    {
      position: 2,
      studentId: ANNA_ID,
      firstName: 'Анна',
      lastName: 'Коваленко',
      groupName: 'JS-1',
      redCoins: 10,
    },
  ];

  const setupApi = (createTransaction: Parameters<typeof installApi>[0][string]) =>
    installApi({
      '/groups': () => [{ id: 'group-1', name: 'JS-1', teachers: [], students: [] }],
      '/users': () => students,
      '/coins/leaderboard': () => leaderboard,
      'GET /coins/transactions': () => ({ items: [], nextCursor: null }),
      'POST /coins/transactions': createTransaction,
    });

  /** Рядки рейтингу в порядку відображення: «позиція ім'я баланс» */
  const leaderboardRows = () =>
    within(screen.getByText('Рейтинг').closest('[data-slot=card]') as HTMLElement)
      .getAllByRole('button', { name: 'Нарахувати' })
      .map((button) => button.parentElement?.textContent?.replace('Нарахувати', '').trim());

  /** «Нарахувати» в рядку Анни → причина → «Підтвердити» (сума за замовчуванням 10) */
  const awardAnna = async () => {
    const user = userEvent.setup();
    await screen.findByText('Анна Коваленко');
    await user.click(screen.getAllByRole('button', { name: 'Нарахувати' })[1]);
    await user.type(await screen.findByLabelText('Причина'), 'Активність на занятті');
    await user.click(screen.getByRole('button', { name: 'Підтвердити' }));
  };

  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    useAuthStore.getState().setAuth(admin, 'token');
  });

  it('до відповіді сервера показує транзакцію першою і новий баланс у рейтингу', async () => {
    const post = deferred();
    const adapter = setupApi(() => post.promise);
    render(
      <MemoryRouter>
        <CoinsPage />
      </MemoryRouter>
    );

    await awardAnna();

    // Анна: 10 + 10 = 20 — тепер вона перша; сервер ще не відповів
    expect(await screen.findByText('Зберігається…', { exact: false })).toBeInTheDocument();
    expect(leaderboardRows()).toEqual(['1АКАнна КоваленкоJS-120', '2БМБогдан МельникJS-115']);

    post.resolve({
      id: 'tx-1',
      amount: 10,
      reason: 'Активність на занятті',
      category: CoinCategory.ACHIEVEMENT,
      createdAt: '2026-09-01T10:00:00.000Z',
      student: { id: ANNA_ID, firstName: 'Анна', lastName: 'Коваленко' },
      issuer: { id: 'admin-1', firstName: 'Ірина', lastName: 'Адміненко' },
    });

    await waitFor(() =>
      expect(screen.queryByText('Зберігається…', { exact: false })).not.toBeInTheDocument()
    );
    expect(screen.getByText('Активність на занятті')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Нараховано 10 монет: Анна Коваленко');
    // Ні рейтинг, ні історія не перезапитувались
    expect(callsTo(adapter, 'GET', '/coins/leaderboard')).toHaveLength(1);
    expect(callsTo(adapter, 'GET', '/coins/transactions')).toHaveLength(1);
  });

  it('відкочує транзакцію й баланс, якщо сервер відмовив', async () => {
    setupApi((config) => {
      throw httpError(config, 400, 'Недостатньо монет на балансі студента (зараз 10)');
    });
    render(
      <MemoryRouter>
        <CoinsPage />
      </MemoryRouter>
    );

    await awardAnna();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Недостатньо монет на балансі студента (зараз 10)',
        expect.anything()
      )
    );
    expect(screen.queryByText('Активність на занятті')).not.toBeInTheDocument();
    expect(leaderboardRows()).toEqual(['1БМБогдан МельникJS-115', '2АКАнна КоваленкоJS-110']);
  });
});
