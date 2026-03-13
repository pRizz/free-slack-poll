import "dotenv/config";

import { z } from "zod";

import { schedulerDefaults } from "./constants.js";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DEFAULT_TIMEZONE: z.string().default("UTC"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  POLL_ADMIN_USER_IDS: z.string().optional(),
  POLL_CLOSE_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(schedulerDefaults.closeIntervalSeconds),
  POLL_SYNC_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(schedulerDefaults.syncIntervalSeconds),
  SLACK_APP_TOKEN: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
});

export type AppEnv = ReturnType<typeof loadEnv>;

/**
 * Loads and validates environment variables for the application.
 */
export function loadEnv(environment: NodeJS.ProcessEnv = process.env) {
  const parsedEnvironment = envSchema.parse(environment);

  return {
    databaseUrl: parsedEnvironment.DATABASE_URL,
    defaultTimezone: parsedEnvironment.DEFAULT_TIMEZONE,
    logLevel: parsedEnvironment.LOG_LEVEL,
    pollAdminUserIds: splitCommaSeparatedValues(parsedEnvironment.POLL_ADMIN_USER_IDS),
    pollCloseIntervalSeconds: parsedEnvironment.POLL_CLOSE_INTERVAL_SECONDS,
    pollSyncIntervalSeconds: parsedEnvironment.POLL_SYNC_INTERVAL_SECONDS,
    slackAppToken: parsedEnvironment.SLACK_APP_TOKEN,
    slackBotToken: parsedEnvironment.SLACK_BOT_TOKEN,
    slackSigningSecret: parsedEnvironment.SLACK_SIGNING_SECRET,
  };
}

function splitCommaSeparatedValues(maybeValue?: string) {
  if (!maybeValue) {
    return [];
  }

  return maybeValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
