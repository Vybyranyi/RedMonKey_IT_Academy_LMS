// env імпортується першим: він валідує оточення і падає до того, як щось стартує.
import { env } from './config/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import apiRoutes from './routes/index.routes.js';

/**
 * Застосунок збирається окремо від `listen()` — так тести піднімають ті самі
 * роути й middleware через supertest, не займаючи порт.
 */
export const app = express();

app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Маршрути
app.use("/api/v1", apiRoutes);

export default app;
