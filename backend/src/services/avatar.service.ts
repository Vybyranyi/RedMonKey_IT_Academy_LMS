import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AVATAR_SIZE } from '../config/constants.js';
import { avatarStorageRepository } from '../repositories/avatarStorage.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { TokenPayload } from '../utils/jwt.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
} from '../utils/errors.js';
import { accessPolicy } from './access.policy.js';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

// Захист від «декомпресійної бомби»: крихітний файл, що розгортається в гігапікселі
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Перекодування — головний захист, а не лише економія місця: формат визначається
 * за вмістом, а не за Content-Type від клієнта (SVG чи HTML під виглядом .png
 * не пройдуть), а EXIF з GPS-координатами телефонного фото не потрапить у сховище.
 */
const toAvatarWebp = async (input: Buffer): Promise<Buffer> => {
  const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
  let format: string | undefined;
  try {
    ({ format } = await image.metadata());
  } catch {
    throw new BadRequestError('Файл не є зображенням');
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new BadRequestError('Підтримуються лише JPG, PNG або WebP');
  }

  try {
    return await image
      .rotate() // повертає фото за EXIF-орієнтацією, до того як EXIF зникне
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new BadRequestError('Не вдалося обробити зображення');
  }
};

const assertCanManage = async (actor: TokenPayload, targetId: string) => {
  if (!accessPolicy.canManageAvatar(actor, targetId)) {
    throw new ForbiddenError('Змінювати можна лише власну аватарку');
  }
  if (!avatarStorageRepository.isConfigured()) {
    throw new ServiceUnavailableError('Сховище файлів не налаштоване');
  }
  const user = await userRepository.findByIdActive(targetId);
  if (!user) throw new NotFoundError('Користувача не знайдено');
  return user;
};

/** Старий файл прибираємо після успішного оновлення; збій — не привід для помилки користувачу. */
const removeQuietly = async (avatarUrl: string | null) => {
  const path = avatarUrl ? avatarStorageRepository.pathFromUrl(avatarUrl) : null;
  if (!path) return;
  try {
    await avatarStorageRepository.remove([path]);
  } catch (error) {
    console.error(`[avatar]: не вдалося видалити ${path}`, error);
  }
};

export const avatarService = {
  async uploadAvatar(actor: TokenPayload, targetId: string, file: Buffer | undefined) {
    const user = await assertCanManage(actor, targetId);
    if (!file || file.length === 0) throw new BadRequestError('Файл не передано');

    const webp = await toAvatarWebp(file);
    // Новий шлях на кожне завантаження: CDN і браузери кешують файл назавжди
    const path = `${targetId}/${randomUUID()}.webp`;
    await avatarStorageRepository.upload(path, webp);

    let updated;
    try {
      updated = await userRepository.update(targetId, {
        avatar: avatarStorageRepository.publicUrl(path),
      });
    } catch (error) {
      // Запис у БД не відбувся — файл, на який ніхто не посилається, не лишаємо
      await avatarStorageRepository.remove([path]).catch(() => undefined);
      throw error;
    }

    await removeQuietly(user.avatar);
    return updated;
  },

  async deleteAvatar(actor: TokenPayload, targetId: string) {
    const user = await assertCanManage(actor, targetId);
    const updated = await userRepository.update(targetId, { avatar: null });
    await removeQuietly(user.avatar);
    return updated;
  },
};
