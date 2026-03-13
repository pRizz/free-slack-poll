import { eq } from "drizzle-orm";

import { workspaces } from "../db/schema.js";
import type { DatabaseExecutor } from "./database.js";

export interface UpsertWorkspaceInput {
  teamDomain?: string | null;
  teamId: string;
  teamName?: string | null;
}

export class WorkspaceRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async upsertWorkspace(input: UpsertWorkspaceInput) {
    const [workspace] = await this.db
      .insert(workspaces)
      .values({
        id: input.teamId,
        teamDomain: input.teamDomain ?? null,
        teamId: input.teamId,
        teamName: input.teamName ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        set: {
          teamDomain: input.teamDomain ?? null,
          teamName: input.teamName ?? null,
          updatedAt: new Date(),
        },
        target: workspaces.teamId,
      })
      .returning();

    if (!workspace) {
      throw new Error("Failed to upsert workspace.");
    }

    return workspace;
  }

  async findByTeamId(teamId: string) {
    return this.db.query.workspaces.findFirst({
      where: eq(workspaces.teamId, teamId),
    });
  }
}
