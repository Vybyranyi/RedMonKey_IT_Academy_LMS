import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

/**
 * Клієнт з секретним ключем — лише на сервері: він обходить усі політики Storage.
 * Supabase Auth не використовується (сесія своя, на JWT), тож сесію клієнт не тримає.
 * null — Supabase не налаштовано (тести, CI, локальний docker compose).
 */
export const supabase = env.supabase
  ? createClient(env.supabase.url, env.supabase.secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
