import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "../config/env.js";
import { createLogger } from "../config/logger.js";
import { createDatabaseClient } from "./client.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger({ level: env.logLevel });
  const { pool } = createDatabaseClient(env);
  const migrationDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../drizzle",
  );

  try {
    const client = await pool.connect();

    try {
      await client.query("CREATE SCHEMA IF NOT EXISTS slack_poll");
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_poll.schema_migrations (
          name text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      const filenames = (await readdir(migrationDirectory))
        .filter((filename) => filename.endsWith(".sql"))
        .sort();

      const appliedMigrationsResult = await client.query<{
        name: string;
      }>("SELECT name FROM slack_poll.schema_migrations");
      const appliedMigrationNames = new Set(
        appliedMigrationsResult.rows.map((row) => row.name),
      );

      for (const filename of filenames) {
        if (appliedMigrationNames.has(filename)) {
          continue;
        }

        const migrationPath = path.join(migrationDirectory, filename);
        const migrationSql = await readFile(migrationPath, "utf8");

        await client.query("BEGIN");
        await client.query(migrationSql);
        await client.query("INSERT INTO slack_poll.schema_migrations (name) VALUES ($1)", [
          filename,
        ]);
        await client.query("COMMIT");

        logger.info({ migration: filename }, "Applied database migration.");
      }
    } finally {
      client.release();
    }

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
