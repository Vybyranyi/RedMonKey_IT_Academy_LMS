import { RequestHandler } from 'express';
import multer from 'multer';
import { AVATAR_MAX_UPLOAD_BYTES } from '@redmonkey/shared';
import { AppError, BadRequestError } from '../utils/errors.js';

const avatarMulter = multer({
  // Файл ніде не зберігається як є: сервіс одразу перекодовує його sharp-ом
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_UPLOAD_BYTES, files: 1 },
}).single('avatar');

/**
 * Розбирає multipart з полем `avatar` у req.file. Помилки multer перетворюються
 * на AppError, щоб errorHandler віддав 413/400 з текстом, а не 500.
 */
export const uploadAvatar: RequestHandler = (req, res, next) => {
  avatarMulter(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        error.code === 'LIMIT_FILE_SIZE'
          ? new AppError(
              `Файл завеликий (максимум ${AVATAR_MAX_UPLOAD_BYTES / 1024 / 1024} МБ)`,
              413
            )
          : new BadRequestError('Очікується один файл у полі avatar')
      );
      return;
    }
    next(error);
  });
};
