import { Router } from 'express';
import { UserRole } from '@redmonkey/shared';
import {
  createTransaction,
  getLeaderboard,
  getStudentBalance,
  getTransactions,
} from '../controllers/coin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Переглядати можуть усі авторизовані; вибірку звужує coinService за роллю
router.get('/transactions', authenticate, getTransactions);
router.get('/leaderboard', authenticate, getLeaderboard);
router.get('/students/:id/balance', authenticate, getStudentBalance);

// Нараховувати й списувати монети можуть адмін і викладач; належність
// студента до групи викладача перевіряє coinService
router.post(
  '/transactions',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TEACHER]),
  createTransaction
);

export default router;
