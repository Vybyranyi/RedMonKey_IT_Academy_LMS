import request from 'supertest';
import sharp from 'sharp';
import { UserRole } from '@redmonkey/shared';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { avatarStorageRepository } from '../repositories/avatarStorage.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { generateAccessToken } from '../utils/jwt.js';

// Як і в api.test.ts: моки лише на найглибшому шарі. sharp справжній — саме його
// перекодування і є захистом від «не-картинок», тож мокати його не можна
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../repositories/user.repository.js', () => ({
  userRepository: { findByIdActive: vi.fn(), update: vi.fn() },
}));
vi.mock('../repositories/avatarStorage.repository.js', () => ({
  avatarStorageRepository: {
    isConfigured: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
    publicUrl: vi.fn(),
    pathFromUrl: vi.fn(),
  },
}));

const findByIdActive = vi.mocked(userRepository.findByIdActive);
const userUpdate = vi.mocked(userRepository.update);
const storage = vi.mocked(avatarStorageRepository);

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEACHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STUDENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTHER_STUDENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const STORAGE = 'https://ref.supabase.co/storage/v1/object/public/avatars/';
const OLD_URL = `${STORAGE}${STUDENT_ID}/old.webp`;

const bearer = (userId: string, role: UserRole) =>
  `Bearer ${generateAccessToken({ userId, role })}`;
const adminAuth = bearer(ADMIN_ID, UserRole.ADMIN);
const teacherAuth = bearer(TEACHER_ID, UserRole.TEACHER);
const studentAuth = bearer(STUDENT_ID, UserRole.STUDENT);

let png: Buffer;

beforeAll(async () => {
  // Не квадрат — щоб перевірити, що результат обрізано до 256×256
  png = await sharp({
    create: { width: 400, height: 300, channels: 3, background: '#C10000' },
  })
    .png()
    .toBuffer();
});

beforeEach(() => {
  vi.clearAllMocks();
  storage.isConfigured.mockReturnValue(true);
  storage.upload.mockResolvedValue(undefined);
  storage.remove.mockResolvedValue(undefined);
  storage.publicUrl.mockImplementation((path) => `${STORAGE}${path}`);
  storage.pathFromUrl.mockImplementation((url) =>
    url.startsWith(STORAGE) ? url.slice(STORAGE.length) : null
  );
  findByIdActive.mockResolvedValue({ id: STUDENT_ID, avatar: OLD_URL } as never);
  userUpdate.mockImplementation(
    async (id, data) => ({ id, avatar: (data as { avatar: string | null }).avatar }) as never
  );
});

const upload = (id: string, auth: string, file: Buffer = png, filename = 'me.png') =>
  request(app)
    .put(`/api/v1/users/${id}/avatar`)
    .set('Authorization', auth)
    .attach('avatar', file, filename);

describe('PUT /api/v1/users/:id/avatar', () => {
  it('студент завантажує свою аватарку: 256×256 WebP, старий файл видалено', async () => {
    const response = await upload(STUDENT_ID, studentAuth);

    expect(response.status).toBe(200);
    expect(response.body.avatar).toMatch(new RegExp(`^${STORAGE}${STUDENT_ID}/[0-9a-f-]+\\.webp$`));

    const [path, stored] = storage.upload.mock.calls[0] as [string, Buffer];
    expect(path).toMatch(new RegExp(`^${STUDENT_ID}/[0-9a-f-]{36}\\.webp$`));
    const meta = await sharp(stored).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256 });

    expect(storage.remove).toHaveBeenCalledWith([`${STUDENT_ID}/old.webp`]);
  });

  it('адмін змінює чужу аватарку', async () => {
    const response = await upload(STUDENT_ID, adminAuth);

    expect(response.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(STUDENT_ID, { avatar: expect.any(String) });
  });

  it.each([
    ['студент — іншому студенту', OTHER_STUDENT_ID, studentAuth],
    ['викладач — студенту', STUDENT_ID, teacherAuth],
    ['студент — адміну', ADMIN_ID, studentAuth],
  ])('403: %s', async (_name, id, auth) => {
    const response = await upload(id, auth);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Змінювати можна лише власну аватарку');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('без токена — 401', async () => {
    const response = await request(app)
      .put(`/api/v1/users/${STUDENT_ID}/avatar`)
      .attach('avatar', png, 'me.png');

    expect(response.status).toBe(401);
  });

  it('без файлу — 400', async () => {
    const response = await request(app)
      .put(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', studentAuth)
      .field('note', 'no file');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Файл не передано');
  });

  it('текстовий файл під виглядом .png — 400', async () => {
    const response = await upload(STUDENT_ID, studentAuth, Buffer.from('hello'), 'fake.png');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Файл не є зображенням');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  // sharp уміє читати SVG — тому формат перевіряється явно
  it('SVG — 400, навіть якщо це коректне зображення', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'
    );
    const response = await upload(STUDENT_ID, studentAuth, svg, 'x.svg');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Підтримуються лише JPG, PNG або WebP');
  });

  it('файл понад 5 МБ — 413 ще до обробки', async () => {
    const response = await upload(STUDENT_ID, studentAuth, Buffer.alloc(5 * 1024 * 1024 + 1));

    expect(response.status).toBe(413);
    expect(response.body.message).toBe('Файл завеликий (максимум 5 МБ)');
    expect(findByIdActive).not.toHaveBeenCalled();
  });

  it('другий файл у запиті — 400', async () => {
    const response = await request(app)
      .put(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', studentAuth)
      .attach('avatar', png, 'a.png')
      .attach('avatar', png, 'b.png');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Очікується один файл у полі avatar');
  });

  it('Supabase не налаштовано — 503', async () => {
    storage.isConfigured.mockReturnValue(false);

    const response = await upload(STUDENT_ID, studentAuth);

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Сховище файлів не налаштоване');
  });

  it('неактивний або неіснуючий користувач — 404', async () => {
    findByIdActive.mockResolvedValue(null as never);

    const response = await upload(OTHER_STUDENT_ID, adminAuth);

    expect(response.status).toBe(404);
  });

  it('збій БД після завантаження — новий файл видаляється, старий лишається', async () => {
    userUpdate.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await upload(STUDENT_ID, studentAuth);

    expect(response.status).toBe(500);
    const [newPath] = storage.upload.mock.calls[0] as [string];
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith([newPath]);
  });

  it('стара аватарка — чужий URL: видаляти нічого', async () => {
    findByIdActive.mockResolvedValue({
      id: STUDENT_ID,
      avatar: 'https://example.com/me.png',
    } as never);

    const response = await upload(STUDENT_ID, studentAuth);

    expect(response.status).toBe(200);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/users/:id/avatar', () => {
  it('адмін видаляє чужу аватарку', async () => {
    const response = await request(app)
      .delete(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', adminAuth);

    expect(response.status).toBe(200);
    expect(response.body.avatar).toBeNull();
    expect(userUpdate).toHaveBeenCalledWith(STUDENT_ID, { avatar: null });
    expect(storage.remove).toHaveBeenCalledWith([`${STUDENT_ID}/old.webp`]);
  });

  it('студент видаляє свою', async () => {
    const response = await request(app)
      .delete(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', studentAuth);

    expect(response.status).toBe(200);
  });

  it('викладач не видаляє аватарку студента', async () => {
    const response = await request(app)
      .delete(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', teacherAuth);

    expect(response.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('збій видалення файлу не ламає відповідь — аватарку в профілі вже прибрано', async () => {
    storage.remove.mockRejectedValue(new Error('storage down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app)
      .delete(`/api/v1/users/${STUDENT_ID}/avatar`)
      .set('Authorization', studentAuth);

    expect(response.status).toBe(200);
    expect(response.body.avatar).toBeNull();
  });
});
