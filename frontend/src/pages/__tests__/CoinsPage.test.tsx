import { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { CoinCategory, UserRole } from '@redmonkey/shared';
import type { IPopulatedCoinTransaction, IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import CoinsPage from '../CoinsPage';

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
