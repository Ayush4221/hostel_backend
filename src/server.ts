import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createLogger } from "./utils/logger.js";
import {
  SYSTEM_WORKING,
  SOMETHING_WENT_WRONG,
  DATABASE_URL_NOT_SET,
  CONNECTED_POSTGRES,
  DATABASE_NOT_CONNECTED,
  CONNECTED_REDIS,
  REDIS_NOT_CONNECTED,
  REDIS_URL_NOT_SET,
  STARTUP_ERROR,
  UNHANDLED_REJECTION,
  UNCAUGHT_EXCEPTION,
  serverRunning,
} from "./utils/constants/messages.js";

const log = createLogger("Server");
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://hostel-backend-9nmb.onrender.com",
      "https://hostel-frontend-fx5j.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: SYSTEM_WORKING
  })
});

// Routes mounted in start() after DB connection (Swagger also mounted there when not production)

// Basic error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    log.error({ err }, SOMETHING_WENT_WRONG);
    res.status(500).json({ message: SOMETHING_WENT_WRONG });
  }
);

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason, promise) => {
  log.error({ promise, reason }, UNHANDLED_REJECTION);
  process.exit(1);
});

process.on("uncaughtException", (err: unknown) => {
  if (err instanceof Error) {
    log.error({ err, message: err.message, stack: err.stack }, UNCAUGHT_EXCEPTION);
  } else {
    try {
      log.error({ err: JSON.stringify(err) }, UNCAUGHT_EXCEPTION);
    } catch {
      log.error({ err: String(err) }, UNCAUGHT_EXCEPTION);
    }
  }
  process.exit(1);
});

async function start() {
  if (!process.env.DATABASE_URL?.trim()) {
    log.error(DATABASE_URL_NOT_SET);
    process.exit(1);
  }
  try {
    const { prisma } = await import("./db/prisma.js");
    await prisma.$connect();
    log.info(CONNECTED_POSTGRES);
  } catch (err) {
    log.error({ err }, DATABASE_NOT_CONNECTED);
    process.exit(1);
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    try {
      const { checkRedisConnection } = await import("./db/redis.js");
      await checkRedisConnection();
      log.info(CONNECTED_REDIS);
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : e },
        REDIS_NOT_CONNECTED
      );
      process.exit(1);
    }
  } else {
    log.info(REDIS_URL_NOT_SET);
  }

  const authRoutes = (await import("./routes/auth.routes.js")).default;
  const parentRoutes = (await import("./routes/parent.routes.js")).default;
  const passwordRoutes = (await import("./routes/passwordreset.routes.js")).default;
  const adminRoutes = (await import("./routes/admin.routes.js")).default;
  const studentRoutes = (await import("./routes/student.routes.js")).default;
  const staffRoutes = (await import("./routes/staff.routes.js")).default;
  const userRoutes = (await import("./routes/user.routes.js")).default;

  app.use("/api/auth", authRoutes);
  app.use("/api/parent", parentRoutes);
  app.use("/api/password", passwordRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/users", userRoutes);

  const { getOrCreatePushWorker } = await import("./services/AnnouncementService.js");
  getOrCreatePushWorker();

  // Swagger UI: spec from Zod schemas (non-production only)
  if (process.env.NODE_ENV !== "production") {
    const swaggerUi = await import("swagger-ui-express");
    const { getOpenApiSpec } = await import("./openapi/spec.js");
    const spec = getOpenApiSpec();
    app.use("/api-docs", swaggerUi.default.serve, swaggerUi.default.setup(spec));
    app.get("/api-docs.json", (_req, res) => res.json(spec));
  }

  app.listen(PORT, () => {
    log.info(serverRunning(PORT));
  });
}

start().catch((e) => {
  log.error({ err: e instanceof Error ? e.message : e }, STARTUP_ERROR);
  process.exit(1);
});
