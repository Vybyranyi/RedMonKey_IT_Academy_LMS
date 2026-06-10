import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { UserRole } from '@redmonkey/shared';

const router = Router();

// Доступно адміну та викладачу (викладач бачить лише обмежені дані через фільтр у контролері)
router.get('/', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), getUsers);
router.get('/:id', authenticate, getUserById);

// Створення, зміна та видалення користувачів доступні лише адміну
router.post('/', authenticate, authorize([UserRole.ADMIN]), createUser);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN]), updateUser);
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), deleteUser);

export default router;