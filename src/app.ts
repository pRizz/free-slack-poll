import { App } from "@slack/bolt";
import { pathToFileURL } from "node:url";

import { loadEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { registerHandlers } from "./slack/registerHandlers.js";

/**
 * Creates the Slack Bolt application.
 */
export function createApp() {
  const env = loadEnv();
  const logger = createLogger({ level: env.logLevel });

  const app = new App({
    appToken: env.slackAppToken,
    signingSecret: env.slackSigningSecret,
    socketMode: true,
    token: env.slackBotToken,
  });

  registerHandlers(app);

  return {
    app,
    env,
    logger,
  };
}

/**
 * Starts the Slack application.
 */
export async function main() {
  const { app, logger } = createApp();

  await app.start();
  logger.info("Slack poll app started in Socket Mode.");
}

const entryFilePath = process.argv[1];
const isEntryPoint =
  entryFilePath !== undefined && import.meta.url === pathToFileURL(entryFilePath).href;

if (isEntryPoint) {
  main().catch((error) => {
    const logger = createLogger({ level: process.env.LOG_LEVEL ?? "error" });
    logger.error({ err: error }, "Failed to start Slack poll app.");
    process.exitCode = 1;
  });
}
