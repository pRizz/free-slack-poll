import pino, { type Logger, type LoggerOptions } from "pino";

/**
 * Creates the application logger.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const maybeTransport =
    process.env.NODE_ENV === "production"
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              ignore: "pid,hostname",
              singleLine: true,
              translateTime: "SYS:standard",
            },
          },
        };

  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    ...maybeTransport,
    ...options,
  });
}
