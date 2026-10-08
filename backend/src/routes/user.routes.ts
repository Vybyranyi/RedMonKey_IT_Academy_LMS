import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  uploadUserAvatar,
  deleteUserAvatar,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { avatarUploadLimiter } from '../middlewares/rateLimit.middleware.js';
import { uploadAvatar } from '../middlewares/upload.middleware.js';
import { UserRole } from '@redmonkey/shared';

const router = Router();

// Доступно адміну та викладачу (викладач бачить лише обмежені дані через фільтр у контролері)
router.get('/', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), getUsers);
// Доступ до конкретного профілю перевіряється на рівні запису в userService.getUserById
router.get('/:id', authenticate, getUserById);
// Доступ перевіряє userService через accessPolicy.canViewUser — те саме правило, що й на профіль
router.get('/:id/stats', authenticate, getUserStats);

// Створення, зміна та видалення користувачів доступні лише адміну
router.post('/', authenticate, authorize([UserRole.ADMIN]), createUser);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN]), updateUser);
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), deleteUser);

// Свою аватарку змінює кожен, чужу — лише адмін: accessPolicy.canManageAvatar в avatarService.
// Профіль ходить сюди ж зі своїм id — окремого /auth/me/avatar немає, правило одне
router.put('/:id/avatar', authenticate, avatarUploadLimiter, uploadAvatar, uploadUserAvatar);
router.delete('/:id/avatar', authenticate, deleteUserAvatar);

export default router;
