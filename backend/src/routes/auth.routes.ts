import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginLimiter, refreshLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Окремі, суворіші за загальний ліміти — на ці два маршрути йде перебір паролів і токенів
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.patch('/me/password', authenticate, changePassword);

export default router;
