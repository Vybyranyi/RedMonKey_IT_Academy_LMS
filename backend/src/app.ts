// env імпортується першим: він валідує оточення і падає до того, як щось стартує.
import { env } from './config/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import { JSON_BODY_LIMIT } from './config/constants.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import apiRoutes from './routes/index.routes.js';

/**
 * Застосунок збирається окремо від `listen()` — так тести піднімають ті самі
 * роути й middleware через supertest, не займаючи порт.
 */
export const app = express();

app.set('trust proxy', env.trustProxy);

// Решта CSP — дефолти helmet. Аватарки лежать у Supabase Storage на іншому домені,
// тож без нього в img-src браузер блокував би їх і показував фолбек з ініціалами
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', ...(env.supabase ? [env.supabase.url] : [])],
      },
    },
  })
);
// CORS до rate-limit: preflight-запити не з'їдають ліміт, а відповідь 429
// отримує CORS-заголовки — інакше браузер не дав би фронту прочитати її текст
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use('/api/v1', apiLimiter);
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

// Маршрути
app.use('/api/v1', apiRoutes);

// Один сервіс замість двох: frontend і API на одному домені, тож не потрібні
// ні CORS, ні SameSite=None для refresh-куки
if (env.staticDir) {
  const staticDir = path.resolve(env.staticDir);
  // Файли в assets/ Vite називає з хешем вмісту — їх можна кешувати назавжди
  app.use(
    '/assets',
    express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y' })
  );
  app.use(express.static(staticDir));
  // SPA: /grades, /coins тощо — роути React Router, файлу під ними немає.
  // /api сюди не потрапляє — невідомий API-маршрут має дати JSON 404, а не index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

// Обидва — строго після маршрутів: 404 для всього, що ніхто не обробив,
// і глобальний обробник помилок останнім у ланцюжку
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
