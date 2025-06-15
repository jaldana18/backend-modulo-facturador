import express from "express";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./core/middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import authRoutes from "./modules/auth/auth.routes";
import { verifyJWT } from "./core/middleware/verifyJWT";
import usersRouter from "./routes/userRoutes";

const swaggerDocument = YAML.load("./swagger.yaml");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Aplica el middleware JWT a todas las rutas siguientes
app.use(verifyJWT);
app.use("/api/users", usersRouter);


app.use(errorHandler);

export default app;
