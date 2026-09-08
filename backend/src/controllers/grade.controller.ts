import { Request, Response } from 'express';
import {
  bulkGradeSchema,
  createGradeSchema,
  gradeFiltersSchema,
  gradeSummaryFiltersSchema,
  updateGradeSchema,
} from '@redmonkey/shared';
import { gradeService } from '../services/grade.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';
import { parseBody, parseQuery } from '../utils/validation.js';

export const getGrades = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const filters = parseQuery(gradeFiltersSchema, req.query);
    const grades = await gradeService.getGrades(filters, req.user);
    res.status(200).json(grades);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні оцінок');
  }
};

export const getGradesSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const filters = parseQuery(gradeSummaryFiltersSchema, req.query);
    const summary = await gradeService.getSummary(filters, req.user);
    res.status(200).json(summary);
  } catch (error) {
    handleError(res, error, 'Помилка при обчисленні середніх балів');
  }
};

export const createGrade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const gradeData = parseBody(createGradeSchema, req.body);
    const grade = await gradeService.createGrade(gradeData, req.user);
    res.status(201).json(grade);
  } catch (error) {
    handleError(res, error, 'Помилка при виставленні оцінки');
  }
};

export const saveBulkGrades = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const bulkData = parseBody(bulkGradeSchema, req.body);
    const grades = await gradeService.saveBulk(bulkData, req.user);
    res.status(200).json(grades);
  } catch (error) {
    handleError(res, error, 'Помилка при масовому виставленні оцінок');
  }
};

export const updateGrade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const gradeData = parseBody(updateGradeSchema, req.body);
    const grade = await gradeService.updateGrade(req.params.id as string, gradeData, req.user);
    res.status(200).json(grade);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні оцінки');
  }
};

export const deleteGrade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    await gradeService.deleteGrade(req.params.id as string, req.user);
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Помилка при видаленні оцінки');
  }
};
