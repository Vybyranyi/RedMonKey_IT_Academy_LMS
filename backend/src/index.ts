// env імпортується першим: він валідує оточення і падає до того, як щось стартує.
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server]: Server is running on port ${env.port}`);
  });
};

startServer();
