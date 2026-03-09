import pino from "pino";

const logLevel = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";

const base = pino({
  level: logLevel,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }),
});

export type Logger = pino.Logger;

/**
 * Create a child logger with a module name so every log line includes context.
 * Use one line per file: const log = createLogger("AuthController");
 */
export function createLogger(moduleName: string): Logger {
  return base.child({ module: moduleName });
}
