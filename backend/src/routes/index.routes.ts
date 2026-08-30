import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes.js';
import groupRoutes from './group.routes.js';
import lessonRoutes from './lesson.routes.js';
import userRoutes from './user.routes.js';
import attendanceRoutes from 'src/routes/attendance.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/lessons', lessonRoutes);
router.use('/users', userRoutes);
router.use('/attendance', attendanceRoutes);

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

export default router;
