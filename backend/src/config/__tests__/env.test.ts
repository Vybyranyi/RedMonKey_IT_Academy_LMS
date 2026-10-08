import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

// env.ts читає process.env на імпорті — кожен тест імпортує його наново
const loadEnv = async (vars: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
  return (await import('../env.js')).env;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env.supabase', () => {
  it('без змінних Supabase вимкнено, а не помилка', async () => {
    const env = await loadEnv({ SUPABASE_URL: '', SUPABASE_SECRET_KEY: '' });
    expect(env.supabase).toBeNull();
  });

  it('зводить URL до origin і бере бакет avatars за замовчуванням', async () => {
    const env = await loadEnv({
      SUPABASE_URL: 'https://ref.supabase.co/',
      SUPABASE_SECRET_KEY: 'sb_secret_x',
    });
    expect(env.supabase).toEqual({
      url: 'https://ref.supabase.co',
      secretKey: 'sb_secret_x',
      avatarBucket: 'avatars',
    });
  });

  it('падає, якщо задано лише одну з двох змінних', async () => {
    await expect(
      loadEnv({ SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SECRET_KEY: '' })
    ).rejects.toThrow('SUPABASE_URL і SUPABASE_SECRET_KEY задаються разом');
  });

  it('падає на некоректному URL', async () => {
    await expect(
      loadEnv({ SUPABASE_URL: 'ref.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_x' })
    ).rejects.toThrow('не є коректним URL');
  });
});

describe('CSP для аватарок', () => {
  const imgSrc = async () => {
    const { app } = await import('../../app.js');
    const response = await request(app).get('/api/v1/health');
    return /img-src ([^;]+)/.exec(response.headers['content-security-policy'] as string)?.[1];
  };

  it('дозволяє картинки з домену Supabase Storage', async () => {
    await loadEnv({ SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_x' });
    expect(await imgSrc()).toBe("'self' data: blob: https://ref.supabase.co");
  });

  it('без Supabase — лише власний домен', async () => {
    await loadEnv({ SUPABASE_URL: '', SUPABASE_SECRET_KEY: '' });
    expect(await imgSrc()).toBe("'self' data: blob:");
  });
});
