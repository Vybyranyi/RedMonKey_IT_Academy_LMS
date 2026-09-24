import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.routes.js";

export const app = express();

app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", apiRoutes);
