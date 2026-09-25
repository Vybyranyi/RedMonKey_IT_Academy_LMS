import type { CoinCategory } from '../enums';

export interface ICoinTransactionBase {
  amount: number;
  reason: string;
  category: CoinCategory;
  relatedLessonId?: string | null;
}

export interface ICoinTransaction extends ICoinTransactionBase {
  id: string;
  academyId?: string;
  studentId: string;
  issuedBy: string;
  createdAt: Date | string;
}

/** Те, що реально повертає API: транзакція разом зі студентом і тим, хто її провів. */
export interface IPopulatedCoinTransaction extends ICoinTransaction {
  student: { id: string; firstName: string; lastName: string; avatar?: string | null };
  issuer: { id: string; firstName: string; lastName: string };
}

/** Сторінка історії транзакцій. nextCursor = null — далі сторінок немає. */
export interface ICoinTransactionPage {
  items: IPopulatedCoinTransaction[];
  nextCursor: string | null;
}

/** Рядок таблиці лідерів. position рахується на бекенді, щоб фронт не робив це двічі. */
export interface ILeaderboardRow {
  position: number;
  studentId: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  groupName: string | null;
  redCoins: number;
}

/** Зведена статистика студента для профілю та дашборду (ТЗ 4.2). */
export interface IUserStats {
  grades: {
    average: number | null;
    count: number;
  };
  coins: {
    balance: number;
    earned: number;
    spent: number;
  };
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number | null;
  };
}
