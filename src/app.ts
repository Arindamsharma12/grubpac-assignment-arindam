import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import routes from "@/routes";
import { errorHandler } from "@/middlewares/errorHandler";

const app = express();

app.use(express.json());
app.use(cookieParser());

const swaggerDocument = YAML.load(path.join(process.cwd(), "docs/swagger.yaml"));
console.log("Swagger loaded:", !!swaggerDocument);
app.use("/api-docs", swaggerUi.serveFiles(swaggerDocument), swaggerUi.setup(swaggerDocument));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "taskflow-api",
  });
});

app.use(routes);

app.use(errorHandler);

export default app;
