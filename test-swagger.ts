import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const app = express();
const swaggerDocument = YAML.load(path.join(__dirname, "docs/swagger.yaml"));
app.use("/api-docs", ...swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3005, () => console.log('started on 3005'));
