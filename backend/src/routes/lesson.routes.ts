import { UserRole } from "@redmonkey/shared";
import { Router } from "express";
import {
  cancelLesson,
  createLesson,
  getLessonById,
  getLessons,
  updateLesson,
} from "../controllers/lesson.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

// Переглядати розклад можуть усі авторизовані; вибірку звужує lessonService за роллю
router.get("/", authenticate, getLessons);
router.get("/:id", authenticate, getLessonById);

// Керувати заняттями можуть адмін і викладач; власність перевіряє accessPolicy.canManageLesson
router.post(
  "/",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TEACHER]),
  createLesson,
);
router.patch(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TEACHER]),
  updateLesson,
);
router.patch(
  "/:id/cancel",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.TEACHER]),
  cancelLesson,
);

export default router;
