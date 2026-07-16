import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
} from '../controllers/group.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { UserRole } from '@redmonkey/shared';

const router = Router();


router.get('/', authenticate, getGroups);
// Доступ до конкретної групи перевіряється на рівні запису в groupService.getGroupById
router.get('/:id', authenticate, getGroupById);


router.post('/', authenticate, authorize([UserRole.ADMIN]), createGroup);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN]), updateGroup);
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), deleteGroup);

export default router;