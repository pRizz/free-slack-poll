import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgTransaction } from "drizzle-orm/node-postgres";

import type { Database } from "../db/client.js";
import type * as schema from "../db/schema.js";

export type DatabaseExecutor =
  | Database
  | NodePgTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;
