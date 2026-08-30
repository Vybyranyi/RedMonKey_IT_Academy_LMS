import {
  createLessonSchema,
  lessonFiltersSchema,
  updateLessonSchema,
} from "@redmonkey/shared/src/schema/lesson.schema.js";
import { Request, Response } from "express";
import { lessonService } from "../services/lesson.service.js";
import { UnauthorizedError, handleError } from "../utils/errors.js";
import { parseBody, parseQuery } from "../utils/validation.js";
import { completeLessonSchema } from "@redmonkey/shared";

export const getLessons = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const filters = parseQuery(lessonFiltersSchema, req.query);
    const lessons = await lessonService.getLessons(filters, req.user);
    res.status(200).json(lessons);
  } catch (error) {
    handleError(res, error, "Помилка при отриманні занять");
  }
};

export const getLessonById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const lesson = await lessonService.getLessonById(
      req.params.id as string,
      req.user,
    );
    res.status(200).json(lesson);
  } catch (error) {
    handleError(res, error, "Помилка при отриманні заняття");
  }
};

export const createLesson = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const lessonData = parseBody(createLessonSchema, req.body);
    const lesson = await lessonService.createLesson(lessonData, req.user);
    res.status(201).json(lesson);
  } catch (error) {
    handleError(res, error, "Помилка при створенні заняття");
  }
};

export const updateLesson = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const lessonData = parseBody(updateLessonSchema, req.body);
    const lesson = await lessonService.updateLesson(
      req.params.id as string,
      lessonData,
      req.user,
    );
    res.status(200).json(lesson);
  } catch (error) {
    handleError(res, error, "Помилка при оновленні заняття");
  }
};

/**
 * DELETE у ТЗ 4.4 — це м'яке скасування (status: cancelled), а не фізичне
 * видалення, тож відповідь несе оновлене заняття, а не порожній 204.
 */
export const deleteLesson = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const lesson = await lessonService.cancelLesson(
      req.params.id as string,
      req.user,
    );
    res.status(200).json(lesson);
  } catch (error) {
    handleError(res, error, "Помилка при скасуванні заняття");
  }
};

export const completeLesson = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError("Авторизація обовʼязкова");
    const { records } = parseBody(completeLessonSchema, req.body);
    const lesson = await lessonService.completeLesson(
      req.params.id as string,
      records,
      req.user,
    );
    res.status(200).json(lesson);
  } catch (error) {
    handleError(res, error, "Помилка при завершенні заняття");
  }
};

