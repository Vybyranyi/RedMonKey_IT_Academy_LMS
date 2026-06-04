import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/register',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    res.status(201).json({ message: 'Користувач успішно зареєстрований (заглушка)' });
  }
);

export default router;
