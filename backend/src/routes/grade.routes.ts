import { Router } from 'express';
import { UserRole } from '@redmonkey/shared';
import {
  createGrade,
  deleteGrade,
  getGrades,
  getGradesSummary,
  saveBulkGrades,
  updateGrade,
} from '../controllers/grade.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Переглядати можуть усі авторизовані; вибірку звужує gradeService за роллю.
// /summary оголошено до /:id — інакше Express прийняв би "summary" за id.
router.get('/summary', authenticate, getGradesSummary);
router.get('/', authenticate, getGrades);

// Виставляти оцінки можуть адмін і викладач; власність заняття перевіряє
// accessPolicy.canManageLesson усередині сервісу
router.post('/', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), createGrade);
router.post('/bulk', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), saveBulkGrades);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.TEACHER]), updateGrade);

// Видаляти оцінки може лише адмін (ТЗ 4.5)
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), deleteGrade);

export default router;
