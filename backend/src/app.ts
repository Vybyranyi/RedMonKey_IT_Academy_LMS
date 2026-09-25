// env імпортується першим: він валідує оточення і падає до того, як щось стартує.
import { env } from './config/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
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

app.use(helmet());
// CORS до rate-limit: preflight-запити не з'їдають ліміт, а відповідь 429
// отримує CORS-заголовки — інакше браузер не дав би фронту прочитати її текст
app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use('/api/v1', apiLimiter);
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

// Маршрути
app.use("/api/v1", apiRoutes);

// Обидва — строго після маршрутів: 404 для всього, що ніхто не обробив,
// і глобальний обробник помилок останнім у ланцюжку
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
