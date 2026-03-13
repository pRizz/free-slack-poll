import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";

import { votes } from "../db/schema.js";
import { toVoteRecord } from "./recordMappers.js";
import type { DatabaseExecutor } from "./database.js";

export class VoteRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async listVotesForPoll(pollId: string) {
    const rows = await this.db
      .select()
      .from(votes)
      .where(eq(votes.pollId, pollId))
      .orderBy(asc(votes.createdAt));

    return rows.map(toVoteRecord);
  }

  async listVotesForPollAndUser(pollId: string, voterUserId: string) {
    const rows = await this.db
      .select()
      .from(votes)
      .where(and(eq(votes.pollId, pollId), eq(votes.voterUserId, voterUserId)));

    return rows.map(toVoteRecord);
  }

  async applyVoteMutation(input: {
    addedOptionIds: string[];
    pollId: string;
    removedOptionIds: string[];
    voterUserId: string;
  }) {
    if (input.removedOptionIds.length > 0) {
      await this.db
        .delete(votes)
        .where(
          and(
            eq(votes.pollId, input.pollId),
            eq(votes.voterUserId, input.voterUserId),
            inArray(votes.pollOptionId, input.removedOptionIds),
          ),
        );
    }

    if (input.addedOptionIds.length > 0) {
      await this.db.insert(votes).values(
        input.addedOptionIds.map((pollOptionId) => ({
          id: randomUUID(),
          pollId: input.pollId,
          pollOptionId,
          voterUserId: input.voterUserId,
        })),
      );
    }
  }
}
