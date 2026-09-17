import { CoinCategory } from '@redmonkey/shared';

export interface CoinCategoryMeta {
  label: string;
  badge: string;
}

export const COIN_CATEGORY_META: Record<CoinCategory, CoinCategoryMeta> = {
  [CoinCategory.ACHIEVEMENT]: {
    label: 'Досягнення',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  [CoinCategory.HOMEWORK]: {
    label: 'Домашня робота',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [CoinCategory.ACTIVITY]: {
    label: 'Активність',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [CoinCategory.BONUS]: {
    label: 'Бонус',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  [CoinCategory.PENALTY]: {
    label: 'Штраф',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
};

/** Плюс і мінус фарбуємо однаково всюди: у списку транзакцій і в картці балансу. */
export const getAmountColor = (amount: number): string =>
  amount >= 0 ? 'text-emerald-600' : 'text-[#C10000]';

export const formatAmount = (amount: number): string =>
  `${amount > 0 ? '+' : ''}${amount}`;

/** Медаль для перших трьох місць рейтингу; далі — нейтральний сірий. */
export const getPositionColor = (position: number): string => {
  if (position === 1) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (position === 2) return 'bg-slate-200 text-slate-700 border-slate-300';
  if (position === 3) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};
