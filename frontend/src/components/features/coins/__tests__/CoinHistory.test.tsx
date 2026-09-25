import { CoinCategory } from '@redmonkey/shared';
import type { IPopulatedCoinTransaction } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CoinHistory from '../CoinHistory';

const transaction = {
  id: 'tx-1',
  amount: 10,
  reason: 'Активність на занятті',
  category: CoinCategory.ACTIVITY,
  createdAt: '2026-09-01T10:00:00.000Z',
  student: { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  issuer: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
} as IPopulatedCoinTransaction;

describe('CoinHistory — «Показати ще»', () => {
  it('показує кнопку, коли на сервері є ще сторінки', async () => {
    const onLoadMore = vi.fn();
    render(
      <CoinHistory transactions={[transaction]} isLoading={false} hasMore onLoadMore={onLoadMore} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Показати ще' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('ховає кнопку на останній сторінці', () => {
    render(
      <CoinHistory
        transactions={[transaction]}
        isLoading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Показати ще' })).not.toBeInTheDocument();
  });

  // Повторний клік під час завантаження запросив би ту саму сторінку двічі
  it('блокує кнопку, поки сторінка вантажиться', () => {
    render(
      <CoinHistory
        transactions={[transaction]}
        isLoading={false}
        hasMore
        isLoadingMore
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Завантаження...' })).toBeDisabled();
  });

  it('не показує кнопку під час першого завантаження', () => {
    render(<CoinHistory transactions={[]} isLoading hasMore onLoadMore={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
