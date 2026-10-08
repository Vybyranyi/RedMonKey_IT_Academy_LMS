import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';

const bucket = () => {
  if (!supabase || !env.supabase) throw new Error('Supabase Storage не налаштовано');
  return supabase.storage.from(env.supabase.avatarBucket);
};

/** Єдиний шар, що торкається Supabase Storage — як репозиторії для Prisma. */
export const avatarStorageRepository = {
  isConfigured(): boolean {
    return supabase !== null;
  },

  async upload(path: string, data: Buffer): Promise<void> {
    // Шлях щоразу новий, тож заміна аватарки кешу не боїться. Але CDN Supabase на
    // free-плані після видалення файлу ще віддає його з кешу до кінця max-age —
    // година замість року, щоб видалене фото не жило за старим посиланням місяцями
    const { error } = await bucket().upload(path, data, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
  },

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await bucket().remove(paths);
    if (error) throw error;
  },

  publicUrl(path: string): string {
    return bucket().getPublicUrl(path).data.publicUrl;
  },

  /** Шлях у бакеті за публічним URL; null — файл не наш (старе посилання, вставлене вручну). */
  pathFromUrl(url: string): string | null {
    if (!env.supabase) return null;
    const prefix = `${env.supabase.url}/storage/v1/object/public/${env.supabase.avatarBucket}/`;
    return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
  },
};
