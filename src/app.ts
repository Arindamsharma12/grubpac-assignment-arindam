import express from "express";
import cookieParser from "cookie-parser";
import routes from "@/routes";
import { errorHandler } from "@/middlewares/errorHandler";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "taskflow-api",
  });
});

// Mount all API routes
app.use(routes);

// Global error handler — must be registered LAST
app.use(errorHandler);

export default app;
