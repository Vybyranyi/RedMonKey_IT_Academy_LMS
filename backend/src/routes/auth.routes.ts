import { Router } from 'express';
import { login, refresh, logout, getMe, updateMe, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.patch('/me/password', authenticate, changePassword);

export default router;
