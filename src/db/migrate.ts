import { migrate } from "drizzle-orm/node-postgres/migrator";

import { loadEnv } from "../config/env.js";
import { createLogger } from "../config/logger.js";
import { createDatabaseClient } from "./client.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger({ level: env.logLevel });
  const { db, pool } = createDatabaseClient(env);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    logger.info("Database migrations applied successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  const logger = createLogger({ level: process.env.LOG_LEVEL ?? "error" });
  logger.error({ err: error }, "Failed to apply database migrations.");
  process.exitCode = 1;
});
