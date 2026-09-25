import {
  attendanceFiltersSchema,
  bulkAttendanceSchema,
  updateAttendanceSchema,
} from '@redmonkey/shared';
import { parseBody, parseIdParam, parseQuery } from '../utils/validation.js';
import { attendanceService } from '../services/attendance.service.js';
import { Request, Response } from 'express';
import { handleError, UnauthorizedError } from '../utils/errors.js';

export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const filters = parseQuery(attendanceFiltersSchema, req.query);
    const attendance = await attendanceService.getAttendance(filters, req.user);
    res.status(200).json(attendance);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні явки');
  }
};

export const saveBulkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const data = parseBody(bulkAttendanceSchema, req.body);
    const saved = await attendanceService.saveBulk(data, req.user);
    res.status(200).json(saved);
  } catch (error) {
    handleError(res, error, 'Помилка при збереженні явки');
  }
};
export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const id = parseIdParam(req.params.id, 'Запис явки не знайдено');
    const data = parseBody(updateAttendanceSchema, req.body);
    const updated = await attendanceService.updateStatus(id, data, req.user);
    res.status(200).json(updated);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні явки');
  }
};
