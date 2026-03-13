import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "../config/env.js";
import { createLogger } from "../config/logger.js";
import { createDatabaseClient } from "../db/client.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger({ level: env.logLevel });
  const migrationFiles = await readMigrationFiles();
  const { pool } = createDatabaseClient(env);

  try {
    await pool.query("SELECT 1");
  } finally {
    await pool.end();
  }

  logger.info(
    {
      databaseUrl: redactDatabaseUrl(env.databaseUrl),
      migrationCount: migrationFiles.length,
    },
    "Container preflight passed.",
  );
}

function resolveMigrationDirectory() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");
}

async function readMigrationFiles() {
  const migrationDirectory = resolveMigrationDirectory();

  await access(migrationDirectory);

  const migrationFiles = (await readdir(migrationDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationDirectory}.`);
  }

  return migrationFiles;
}

function redactDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.password.length > 0) {
    parsedUrl.password = "***";
  }

  return parsedUrl.toString();
}

main().catch((error) => {
  const logger = createLogger({ level: process.env.LOG_LEVEL ?? "error" });
  logger.error({ err: error }, "Container preflight failed.");
  process.exitCode = 1;
});
