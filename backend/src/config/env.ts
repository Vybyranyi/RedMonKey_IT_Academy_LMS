import 'dotenv/config';

const MIN_SECRET_LENGTH = 32;

const DURATION_PATTERN = /^(\d+)([smhd])$/;

const SECONDS_IN: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

const fail = (message: string): never => {
  throw new Error(`[config]: ${message}`);
};

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`змінна оточення ${name} не задана. Перевірте backend/.env`);
  }
  return value as string;
};

const requireSecret = (name: string): string => {
  const value = requireEnv(name);
  if (value.length < MIN_SECRET_LENGTH) {
    fail(
      `${name} закороткий (${value.length} символів, потрібно ≥ ${MIN_SECRET_LENGTH}). ` +
        `Згенеруйте: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
  return value;
};

/** Перетворює '15m' / '24h' / '7d' на секунди. */
const durationToSeconds = (name: string, raw: string, fallback: string): number => {
  const value = raw.trim() || fallback;
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    fail(`${name}="${value}" має недопустимий формат. Очікується 15m, 24h або 7d`);
  }
  const [, amount, unit] = match as RegExpExecArray;
  return Number(amount) * (SECONDS_IN[unit] as number);
};

/**
 * Скільки проксі стоїть перед застосунком (Render/Railway/Nginx — зазвичай 1).
 * Від цього залежить req.ip, а отже й rate-limit: з 0 за проксі всі клієнти
 * мали б одну IP-адресу балансувальника і вичерпували б спільний ліміт.
 */
const parseTrustProxy = (raw: string | undefined): number => {
  const value = raw?.trim() || '0';
  if (!/^\d+$/.test(value)) {
    fail(`TRUST_PROXY="${value}" має бути кількістю проксі перед застосунком: 0, 1, 2...`);
  }
  return Number(value);
};

/**
 * Supabase Storage (аватарки). Необов'язковий: без нього тести, CI і локальний
 * docker compose працюють, а ендпоінти аватарок відповідають 503. Половина
 * налаштувань — майже напевно помилка в Dashboard, тож тут уже падаємо.
 */
const parseSupabase = () => {
  const url = process.env.SUPABASE_URL?.trim() || null;
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || null;
  if (!url && !secretKey) return null;
  if (!url || !secretKey) {
    fail('SUPABASE_URL і SUPABASE_SECRET_KEY задаються разом (або жодної)');
  }
  let origin = '';
  try {
    origin = new URL(url as string).origin;
  } catch {
    fail(`SUPABASE_URL="${url}" не є коректним URL`);
  }
  return {
    url: origin,
    secretKey: secretKey as string,
    avatarBucket: process.env.SUPABASE_AVATAR_BUCKET?.trim() || 'avatars',
  };
};

const accessSecret = requireSecret('JWT_ACCESS_SECRET');
const refreshSecret = requireSecret('JWT_REFRESH_SECRET');

if (accessSecret === refreshSecret) {
  fail('JWT_ACCESS_SECRET і JWT_REFRESH_SECRET мають бути різними');
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  // RENDER_EXTERNAL_URL Render виставляє сам (https://<сервіс>.onrender.com) —
  // у Blueprint не треба знати адресу сервісу наперед
  clientUrl: process.env.CLIENT_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  databaseUrl: requireEnv('DATABASE_URL'),
  // Тека зі зібраним frontend (Docker-образ). Порожня — backend віддає лише API,
  // як у локальній розробці, де фронт крутить Vite
  staticDir: process.env.STATIC_DIR?.trim() || null,
  supabase: parseSupabase(),
  jwt: {
    accessSecret,
    refreshSecret,
    accessExpiresInSeconds: durationToSeconds(
      'JWT_ACCESS_EXPIRES',
      process.env.JWT_ACCESS_EXPIRES ?? '',
      '15m'
    ),
    refreshExpiresInSeconds: durationToSeconds(
      'JWT_REFRESH_EXPIRES',
      process.env.JWT_REFRESH_EXPIRES ?? '',
      '7d'
    ),
  },
} as const;
