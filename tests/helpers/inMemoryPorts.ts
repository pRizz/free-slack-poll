import type { KnownBlock } from "@slack/types";

import type { PollCloseReason, PollRecord, PollSnapshot, VoteRecord } from "../../src/domain/polls/types.js";
import type {
  HomePublisher,
  IdGenerator,
  PollEventStore,
  PollStore,
  SlackMessagePublisher,
  VoteStore,
  WorkspaceStore,
} from "../../src/services/ports.js";

type WorkspaceRecord = {
  id: string;
  teamDomain: string | null;
  teamId: string;
  teamName: string | null;
};

type PollOptionRecord = PollSnapshot["options"][number];

export class InMemoryWorkspaceStore implements WorkspaceStore {
  public readonly workspaces = new Map<string, WorkspaceRecord>();

  async upsertWorkspace(input: { teamDomain?: string | null; teamId: string; teamName?: string | null }) {
    const workspace: WorkspaceRecord = {
      id: input.teamId,
      teamDomain: input.teamDomain ?? null,
      teamId: input.teamId,
      teamName: input.teamName ?? null,
    };

    this.workspaces.set(input.teamId, workspace);

    return workspace;
  }
}

export class InMemoryPollStore implements PollStore {
  public readonly options = new Map<string, PollOptionRecord>();
  public readonly polls = new Map<string, PollRecord>();
  public readonly votes = new Map<string, VoteRecord>();

  async addOptions(options: Array<{
    createdByUserId: string;
    id: string;
    isActive?: boolean;
    pollId: string;
    position: number;
    text: string;
  }>) {
    const createdOptions = options.map((option) => {
      const createdOption: PollOptionRecord = {
        createdAt: new Date(),
        createdByUserId: option.createdByUserId,
        id: option.id,
        isActive: option.isActive ?? true,
        pollId: option.pollId,
        position: option.position,
        text: option.text,
      };

      this.options.set(createdOption.id, createdOption);

      return createdOption;
    });

    return createdOptions;
  }

  async closePoll(
    pollId: string,
    input: {
      closeReason: PollCloseReason;
      closedAt: Date;
      closedByUserId?: string | null;
    },
  ) {
    const poll = this.polls.get(pollId);

    if (!poll) {
      return null;
    }

    const updatedPoll: PollRecord = {
      ...poll,
      closeReason: input.closeReason,
      closedAt: input.closedAt,
      closedByUserId: input.closedByUserId ?? null,
      needsSlackSync: true,
      status: "closed",
      updatedAt: new Date(),
    };

    this.polls.set(pollId, updatedPoll);

    return updatedPoll;
  }

  async createPollWithOptions(input: {
    options: Array<{
      createdByUserId: string;
      id: string;
      isActive?: boolean;
      pollId: string;
      position: number;
      text: string;
    }>;
    poll: {
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
      status?: PollRecord["status"];
      workspaceId: string;
    };
  }) {
    const now = new Date();
    const poll: PollRecord = {
      channelId: input.poll.channelId ?? null,
      closeReason: null,
      closedAt: null,
      closedByUserId: null,
      closesAt: input.poll.closesAt ?? null,
      createdAt: now,
      creatorUserId: input.poll.creatorUserId,
      description: input.poll.description ?? null,
      id: input.poll.id,
      isAnonymous: input.poll.isAnonymous,
      allowOptionAdditions: input.poll.allowOptionAdditions,
      allowsMultipleChoices: input.poll.allowsMultipleChoices,
      allowVoteChanges: input.poll.allowVoteChanges,
      messagePermalink: null,
      messageTs: null,
      needsSlackSync: input.poll.needsSlackSync ?? false,
      question: input.poll.question,
      resultsVisibility: input.poll.resultsVisibility,
      sourceChannelId: input.poll.sourceChannelId ?? null,
      sourceMessageTs: input.poll.sourceMessageTs ?? null,
      sourceType: input.poll.sourceType,
      status: input.poll.status ?? "open",
      updatedAt: now,
      workspaceId: input.poll.workspaceId,
    };

    this.polls.set(poll.id, poll);
    await this.addOptions(input.options);

    return poll;
  }

  async findByIds(pollIds: string[]) {
    return pollIds
      .map((pollId) => this.polls.get(pollId))
      .filter((poll): poll is PollRecord => poll !== undefined);
  }

  async findSnapshotById(pollId: string): Promise<PollSnapshot | null> {
    const poll = this.polls.get(pollId);

    if (!poll) {
      return null;
    }

    return {
      poll,
      options: Array.from(this.options.values())
        .filter((option) => option.pollId === pollId)
        .sort((left, right) => left.position - right.position),
      votes: Array.from(this.votes.values()).filter((vote) => vote.pollId === pollId),
    };
  }

  async findSnapshotByMessage(channelId: string, messageTs: string) {
    const poll = Array.from(this.polls.values()).find(
      (pollRecord) => pollRecord.channelId === channelId && pollRecord.messageTs === messageTs,
    );

    return poll ? this.findSnapshotById(poll.id) : null;
  }

  async listDuePolls(now: Date, limit: number) {
    return Array.from(this.polls.values())
      .filter((poll) => poll.status === "open" && poll.closesAt !== null && poll.closesAt <= now)
      .sort((left, right) => {
        if (left.closesAt === null || right.closesAt === null) {
          return 0;
        }

        return left.closesAt.getTime() - right.closesAt.getTime();
      })
      .slice(0, limit);
  }

  async listManageablePolls(filters: {
    adminUserIds: readonly string[];
    limit: number;
    status?: PollRecord["status"];
    userId: string;
    workspaceId: string;
  }) {
    const isAdmin = filters.adminUserIds.includes(filters.userId);

    return Array.from(this.polls.values())
      .filter((poll) => poll.workspaceId === filters.workspaceId)
      .filter((poll) => (isAdmin ? true : poll.creatorUserId === filters.userId))
      .filter((poll) => (filters.status ? poll.status === filters.status : true))
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, filters.limit);
  }

  async listOptions(pollId: string) {
    return Array.from(this.options.values())
      .filter((option) => option.pollId === pollId)
      .sort((left, right) => left.position - right.position)
      .map((option) => ({
        id: option.id,
        pollId: option.pollId,
        position: option.position,
        text: option.text,
      }));
  }

  async listPollsNeedingSlackSync(limit: number) {
    return Array.from(this.polls.values())
      .filter((poll) => poll.needsSlackSync)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, limit);
  }

  async listRecentPollsForUser(filters: {
    limit: number;
    status?: PollRecord["status"];
    userId: string;
    workspaceId: string;
  }) {
    return Array.from(this.polls.values())
      .filter(
        (poll) => poll.workspaceId === filters.workspaceId && poll.creatorUserId === filters.userId,
      )
      .filter((poll) => (filters.status ? poll.status === filters.status : true))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, filters.limit);
  }

  async markSlackSyncState(pollId: string, needsSlackSync: boolean) {
    const poll = this.polls.get(pollId);

    if (!poll) {
      return null;
    }

    const updatedPoll: PollRecord = {
      ...poll,
      needsSlackSync,
      updatedAt: new Date(),
    };

    this.polls.set(pollId, updatedPoll);

    return updatedPoll;
  }

  async updateMessageReference(
    pollId: string,
    input: {
      channelId: string;
      messagePermalink?: string | null;
      messageTs: string;
    },
  ) {
    const poll = this.polls.get(pollId);

    if (!poll) {
      return null;
    }

    const updatedPoll: PollRecord = {
      ...poll,
      channelId: input.channelId,
      messagePermalink: input.messagePermalink ?? null,
      messageTs: input.messageTs,
      updatedAt: new Date(),
    };

    this.polls.set(pollId, updatedPoll);

    return updatedPoll;
  }
}

export class InMemoryVoteStore implements VoteStore {
  constructor(private readonly pollStore: InMemoryPollStore) {}

  async applyVoteMutation(input: {
    addedOptionIds: string[];
    pollId: string;
    removedOptionIds: string[];
    voterUserId: string;
  }) {
    for (const vote of Array.from(this.pollStore.votes.values())) {
      if (
        vote.pollId === input.pollId &&
        vote.voterUserId === input.voterUserId &&
        input.removedOptionIds.includes(vote.pollOptionId)
      ) {
        this.pollStore.votes.delete(vote.id);
      }
    }

    for (const pollOptionId of input.addedOptionIds) {
      const duplicateVote = Array.from(this.pollStore.votes.values()).find(
        (vote) =>
          vote.pollId === input.pollId &&
          vote.pollOptionId === pollOptionId &&
          vote.voterUserId === input.voterUserId,
      );

      if (duplicateVote) {
        throw new Error("Duplicate vote");
      }

      const id = `vote_${this.pollStore.votes.size + 1}`;
      const now = new Date();

      this.pollStore.votes.set(id, {
        createdAt: now,
        id,
        pollId: input.pollId,
        pollOptionId,
        updatedAt: now,
        voterUserId: input.voterUserId,
      });
    }
  }

  async listVotesForPoll(pollId: string) {
    return Array.from(this.pollStore.votes.values()).filter((vote) => vote.pollId === pollId);
  }

  async listVotesForPollAndUser(pollId: string, voterUserId: string) {
    return Array.from(this.pollStore.votes.values()).filter(
      (vote) => vote.pollId === pollId && vote.voterUserId === voterUserId,
    );
  }
}

export class InMemoryPollEventStore implements PollEventStore {
  public readonly events: Array<{
    actorUserId?: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
    pollId: string;
  }> = [];

  async append(input: {
    actorUserId?: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
    pollId: string;
  }) {
    this.events.push(input);

    return input;
  }
}

export class InMemorySlackMessagePublisher implements SlackMessagePublisher {
  public failUpdates = false;
  public readonly postedMessages: Array<{
    blocks: KnownBlock[];
    channelId: string;
    text: string;
  }> = [];
  public readonly updatedMessages: Array<{
    blocks: KnownBlock[];
    channelId: string;
    messageTs: string;
    text: string;
  }> = [];

  async postPollMessage(input: { blocks: KnownBlock[]; channelId: string; text: string }) {
    this.postedMessages.push(input);

    return {
      channelId: input.channelId,
      messagePermalink: `https://slack.test/${input.channelId}/1`,
      messageTs: `${this.postedMessages.length}`,
    };
  }

  async updatePollMessage(input: {
    blocks: KnownBlock[];
    channelId: string;
    messageTs: string;
    text: string;
  }) {
    if (this.failUpdates) {
      throw new Error("Update failed");
    }

    this.updatedMessages.push(input);
  }
}

export class InMemoryHomePublisher implements HomePublisher {
  public readonly publishedHomes: Array<{ blocks: KnownBlock[]; userId: string }> = [];

  async publishHome(input: { blocks: KnownBlock[]; userId: string }) {
    this.publishedHomes.push(input);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  next() {
    const value = `${this.nextId}`;

    this.nextId += 1;

    return value;
  }
}
