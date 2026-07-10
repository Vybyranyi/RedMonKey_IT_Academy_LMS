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

const accessSecret = requireSecret('JWT_ACCESS_SECRET');
const refreshSecret = requireSecret('JWT_REFRESH_SECRET');

if (accessSecret === refreshSecret) {
  fail('JWT_ACCESS_SECRET і JWT_REFRESH_SECRET мають бути різними');
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUrl: requireEnv('MONGO_URL'),
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
