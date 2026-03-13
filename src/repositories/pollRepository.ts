import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";

import { pollOptions, polls } from "../db/schema.js";
import type { PollCloseReason, PollRecord, PollSnapshot, PollStatus } from "../domain/polls/types.js";
import type { DatabaseExecutor } from "./database.js";
import { toPollRecord, toPollSnapshot } from "./recordMappers.js";

export interface CreatePollRecordInput {
  allowOptionAdditions: boolean;
  allowsMultipleChoices: boolean;
  allowVoteChanges: boolean;
  channelId?: string | null;
  closesAt?: Date | null;
  creatorUserId: string;
  description?: string | null;
  id: string;
  isAnonymous: boolean;
  needsSlackSync?: boolean;
  question: string;
  resultsVisibility: PollRecord["resultsVisibility"];
  sourceChannelId?: string | null;
  sourceMessageTs?: string | null;
  sourceType: PollRecord["sourceType"];
  status?: PollStatus;
  workspaceId: string;
}

export interface CreatePollOptionInput {
  createdByUserId: string;
  id: string;
  isActive?: boolean;
  pollId: string;
  position: number;
  text: string;
}

export interface PollListFilters {
  limit: number;
  status?: PollStatus;
  userId: string;
  workspaceId: string;
}

export class PollRepository {
  constructor(private readonly db: DatabaseExecutor) {}

  async createPollWithOptions(input: {
    options: CreatePollOptionInput[];
    poll: CreatePollRecordInput;
  }) {
    const [createdPoll] = await this.db
      .insert(polls)
      .values({
        allowOptionAdditions: input.poll.allowOptionAdditions,
        allowsMultipleChoices: input.poll.allowsMultipleChoices,
        allowVoteChanges: input.poll.allowVoteChanges,
        channelId: input.poll.channelId ?? null,
        closesAt: input.poll.closesAt ?? null,
        creatorUserId: input.poll.creatorUserId,
        description: input.poll.description ?? null,
        id: input.poll.id,
        isAnonymous: input.poll.isAnonymous,
        needsSlackSync: input.poll.needsSlackSync ?? false,
        question: input.poll.question,
        resultsVisibility: input.poll.resultsVisibility,
        sourceChannelId: input.poll.sourceChannelId ?? null,
        sourceMessageTs: input.poll.sourceMessageTs ?? null,
        sourceType: input.poll.sourceType,
        status: input.poll.status ?? "open",
        workspaceId: input.poll.workspaceId,
      })
      .returning();

    if (!createdPoll) {
      throw new Error("Failed to create poll record.");
    }

    if (input.options.length > 0) {
      await this.db.insert(pollOptions).values(
        input.options.map((option) => ({
          createdByUserId: option.createdByUserId,
          id: option.id,
          isActive: option.isActive ?? true,
          pollId: option.pollId,
          position: option.position,
          text: option.text,
        })),
      );
    }

    return toPollRecord(createdPoll);
  }

  async findSnapshotById(pollId: string): Promise<PollSnapshot | null> {
    const result = await this.db.query.polls.findFirst({
      where: eq(polls.id, pollId),
      with: {
        options: {
          orderBy: (table, orderHelpers) => [orderHelpers.asc(table.position)],
        },
        votes: true,
      },
    });

    if (!result) {
      return null;
    }

    return toPollSnapshot(result, result.options, result.votes);
  }

  async findSnapshotByMessage(channelId: string, messageTs: string): Promise<PollSnapshot | null> {
    const result = await this.db.query.polls.findFirst({
      where: and(eq(polls.channelId, channelId), eq(polls.messageTs, messageTs)),
      with: {
        options: {
          orderBy: (table, orderHelpers) => [orderHelpers.asc(table.position)],
        },
        votes: true,
      },
    });

    if (!result) {
      return null;
    }

    return toPollSnapshot(result, result.options, result.votes);
  }

  async updateMessageReference(
    pollId: string,
    input: {
      channelId: string;
      messagePermalink?: string | null;
      messageTs: string;
    },
  ) {
    const [updatedPoll] = await this.db
      .update(polls)
      .set({
        channelId: input.channelId,
        messagePermalink: input.messagePermalink ?? null,
        messageTs: input.messageTs,
        updatedAt: new Date(),
      })
      .where(eq(polls.id, pollId))
      .returning();

    return updatedPoll ? toPollRecord(updatedPoll) : null;
  }

  async markSlackSyncState(pollId: string, needsSlackSync: boolean) {
    const [updatedPoll] = await this.db
      .update(polls)
      .set({
        needsSlackSync,
        updatedAt: new Date(),
      })
      .where(eq(polls.id, pollId))
      .returning();

    return updatedPoll ? toPollRecord(updatedPoll) : null;
  }

  async closePoll(
    pollId: string,
    input: {
      closeReason: PollCloseReason;
      closedAt: Date;
      closedByUserId?: string | null;
    },
  ) {
    const [updatedPoll] = await this.db
      .update(polls)
      .set({
        closeReason: input.closeReason,
        closedAt: input.closedAt,
        closedByUserId: input.closedByUserId ?? null,
        needsSlackSync: true,
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(polls.id, pollId))
      .returning();

    return updatedPoll ? toPollRecord(updatedPoll) : null;
  }

  async listDuePolls(now: Date, limit: number) {
    const rows = await this.db
      .select()
      .from(polls)
      .where(and(eq(polls.status, "open"), lte(polls.closesAt, now)))
      .orderBy(asc(polls.closesAt))
      .limit(limit);

    return rows.map(toPollRecord);
  }

  async listPollsNeedingSlackSync(limit: number) {
    const rows = await this.db
      .select()
      .from(polls)
      .where(eq(polls.needsSlackSync, true))
      .orderBy(desc(polls.updatedAt))
      .limit(limit);

    return rows.map(toPollRecord);
  }

  async listRecentPollsForUser(filters: PollListFilters) {
    const whereClause =
      filters.status === undefined
        ? and(eq(polls.workspaceId, filters.workspaceId), eq(polls.creatorUserId, filters.userId))
        : and(
            eq(polls.workspaceId, filters.workspaceId),
            eq(polls.creatorUserId, filters.userId),
            eq(polls.status, filters.status),
          );

    const rows = await this.db
      .select()
      .from(polls)
      .where(whereClause)
      .orderBy(desc(polls.createdAt))
      .limit(filters.limit);

    return rows.map(toPollRecord);
  }

  async listManageablePolls(filters: PollListFilters & { adminUserIds: readonly string[] }) {
    const isAdmin = filters.adminUserIds.includes(filters.userId);
    const baseFilters = [eq(polls.workspaceId, filters.workspaceId)];

    if (!isAdmin) {
      baseFilters.push(eq(polls.creatorUserId, filters.userId));
    }

    if (filters.status !== undefined) {
      baseFilters.push(eq(polls.status, filters.status));
    }

    const rows = await this.db
      .select()
      .from(polls)
      .where(and(...baseFilters))
      .orderBy(desc(polls.updatedAt))
      .limit(filters.limit);

    return rows.map(toPollRecord);
  }

  async listOptions(pollId: string) {
    return this.db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.pollId, pollId))
      .orderBy(asc(pollOptions.position));
  }

  async addOptions(options: CreatePollOptionInput[]) {
    if (options.length === 0) {
      return [];
    }

    return this.db
      .insert(pollOptions)
      .values(
        options.map((option) => ({
          createdByUserId: option.createdByUserId,
          id: option.id,
          isActive: option.isActive ?? true,
          pollId: option.pollId,
          position: option.position,
          text: option.text,
        })),
      )
      .returning();
  }

  async findByIds(pollIds: string[]) {
    if (pollIds.length === 0) {
      return [];
    }

    const rows = await this.db.select().from(polls).where(inArray(polls.id, pollIds));

    return rows.map(toPollRecord);
  }
}
