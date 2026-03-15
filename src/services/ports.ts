import type { KnownBlock } from "@slack/types";

import type {
  CreatePollOptionInput,
  CreatePollRecordInput,
  PollListFilters,
} from "../repositories/pollRepository.js";
import type { AppendPollEventInput } from "../repositories/pollEventRepository.js";
import type {
  CreatePollInput,
  PollCloseReason,
  PollRecord,
  PollSnapshot,
  VoteRecord,
} from "../domain/polls/types.js";

export interface WorkspaceStore {
  upsertWorkspace(input: {
    teamDomain?: string | null;
    teamId: string;
    teamName?: string | null;
  }): Promise<{
    id: string;
    teamDomain: string | null;
    teamId: string;
    teamName: string | null;
  }>;
}

export interface PollStore {
  addOptions(options: CreatePollOptionInput[]): Promise<unknown[]>;
  closePoll(
    pollId: string,
    input: {
      closeReason: PollCloseReason;
      closedAt: Date;
      closedByUserId?: string | null;
    },
  ): Promise<PollRecord | null>;
  createPollWithOptions(input: {
    options: CreatePollOptionInput[];
    poll: CreatePollRecordInput;
  }): Promise<PollRecord>;
  findByIds(pollIds: string[]): Promise<PollRecord[]>;
  findSnapshotById(pollId: string): Promise<PollSnapshot | null>;
  findSnapshotByMessage(
    channelId: string,
    messageTs: string,
  ): Promise<PollSnapshot | null>;
  listDuePolls(now: Date, limit: number): Promise<PollRecord[]>;
  listManageablePolls(
    filters: PollListFilters & { adminUserIds: readonly string[] },
  ): Promise<PollRecord[]>;
  listPollsNeedingSlackSync(limit: number): Promise<PollRecord[]>;
  listRecentPollsForUser(filters: PollListFilters): Promise<PollRecord[]>;
  listOptions(
    pollId: string,
  ): Promise<
    Array<{ id: string; pollId: string; position: number; text: string }>
  >;
  markSlackSyncState(
    pollId: string,
    needsSlackSync: boolean,
  ): Promise<PollRecord | null>;
  updateMessageReference(
    pollId: string,
    input: {
      channelId: string;
      messagePermalink?: string | null;
      messageTs: string;
    },
  ): Promise<PollRecord | null>;
}

export interface VoteStore {
  applyVoteMutation(input: {
    addedOptionIds: string[];
    pollId: string;
    removedOptionIds: string[];
    voterUserId: string;
  }): Promise<void>;
  listVotesForPoll(pollId: string): Promise<VoteRecord[]>;
  listVotesForPollAndUser(
    pollId: string,
    voterUserId: string,
  ): Promise<VoteRecord[]>;
}

export interface PollEventStore {
  append(input: AppendPollEventInput): Promise<unknown>;
}

export interface IdGenerator {
  next(): string;
}

export interface SlackMessagePublisher {
  postPollMessage(input: {
    blocks: KnownBlock[];
    channelId: string;
    text: string;
  }): Promise<{
    channelId: string;
    messagePermalink?: string | null;
    messageTs: string;
  }>;
  updatePollMessage(input: {
    blocks: KnownBlock[];
    channelId: string;
    messageTs: string;
    text: string;
  }): Promise<void>;
}

export interface HomePublisher {
  publishHome(input: { blocks: KnownBlock[]; userId: string }): Promise<void>;
}

export interface PollCreationDependencies {
  idGenerator: IdGenerator;
  pollEventStore: PollEventStore;
  pollStore: PollStore;
  workspaceStore: WorkspaceStore;
}

export interface PollCreationRequest extends CreatePollInput {
  teamDomain?: string | null;
  teamId: string;
  teamName?: string | null;
}
