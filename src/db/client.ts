import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { AppEnv } from "../config/env.js";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Creates the PostgreSQL connection pool and Drizzle client.
 */
export function createDatabaseClient(env: AppEnv) {
  const pool = new Pool({
    connectionString: env.databaseUrl,
  });

  return {
    db: drizzle({ client: pool, schema }),
    pool,
  };
}
