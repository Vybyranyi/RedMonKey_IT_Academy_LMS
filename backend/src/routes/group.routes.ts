import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
} from '../controllers/group.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();


router.get('/', authenticate, getGroups);
router.get('/:id', authenticate, getGroupById);


router.post('/', authenticate, authorize(['admin']), createGroup);
router.patch('/:id', authenticate, authorize(['admin']), updateGroup);
router.delete('/:id', authenticate, authorize(['admin']), deleteGroup);

export default router;