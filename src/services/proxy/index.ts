import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDatabases } from "./connections.js";
import { internalKeyAuth } from "./middleware/auth.js";
import { userRoutes } from "./routes/user.js";
import { toolsRoutes } from "./routes/tools.js";
import { seedSinglish } from "./seeds/singlish.js";
import { seedCpfLinks } from "./seeds/cpf-links.js";
import { createServiceLogger } from "../../shared/logger.js";

dotenv.config();

const log = createServiceLogger("db-proxy");
const app = express();

app.use(helmet());
app.use(express.json());

// Health check is unauthenticated so Docker can probe it without the internal key
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(internalKeyAuth);
app.use("/user", userRoutes);
app.use("/tools", toolsRoutes);

const PORT = parseInt(process.env.PORT ?? "4000", 10);

connectDatabases()
  .then(() => seedSinglish())
  .then(() => seedCpfLinks())
  .then(() => {
    app.listen(PORT, () => {
      log.info({ port: PORT }, "db-proxy started");
    });
  })
  .catch((err: unknown) => {
    log.error(err, "Failed to start db-proxy");
    process.exit(1);
  });
