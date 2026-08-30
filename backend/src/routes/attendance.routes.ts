import { Router } from 'express';
import {
  getAttendance,
  saveBulkAttendance,
  updateAttendance,
} from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { UserRole } from '@redmonkey/shared';

const router = Router();

// Доступ до конкретного запису перевіряється в attendanceService
router.get('/', authenticate, getAttendance);

router.post('/bulk', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), saveBulkAttendance);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), updateAttendance);

export default router;
