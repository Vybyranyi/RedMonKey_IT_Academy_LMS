import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import groupRoutes from './group.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/users', userRoutes);

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

export default router;
