import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Маршрути
app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server]: Server is running on port ${PORT}`);
  });
};

startServer();