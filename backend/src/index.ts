import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.routes.js";

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
app.use("/api/v1", apiRoutes);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server]: Server is running on port ${PORT}`);
  });
};

startServer();
