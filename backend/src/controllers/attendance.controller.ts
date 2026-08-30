import { bulkAttendanceSchema, updateAttendanceSchema } from '@redmonkey/shared/src/schema/attendance.schema';
import { parseBody } from '../utils/validation.js';
import { attendanceService } from 'src/repositories/attendance.service.js';
import { Request, Response} from 'express';
import { handleError, UnauthorizedError } from 'src/utils/errors.js';

const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try{
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const {lessonId, studentId} = req.params;
    const attendance = await attendanceService.getAttendance({ lessonId, studentId }, req.user);
    res.status(200).json(attendance);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні явки');

  }

}

const saveBulkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const data = parseBody(bulkAttendanceSchema, req.body);
    const saved = await attendanceService.saveBulk(data, req.user);
    res.status(200).json(saved);
  } catch (error) {
    handleError(res, error, 'Помилка при збереженні явки');
  }


}
const updateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const { id } = req.params as { id: string };
    const data = parseBody(updateAttendanceSchema, req.body);
    const updated = await attendanceService.updateStatus(id, data, req.user);
    res.status(200).json(updated);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні явки');
  }


}
//памагітє пажалуста i`m typed some shit there ig
