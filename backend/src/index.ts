// env імпортується першим: він валідує оточення і падає до того, як щось стартує.
import { env } from "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.routes.js";

const app = express();

app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Маршрути
app.use("/api/v1", apiRoutes);

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server]: Server is running on port ${env.port}`);
  });
};

startServer();
