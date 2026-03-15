import type {
  PollOptionRecord,
  PollRecord,
  PollSnapshot,
  VoteRecord,
} from "../../src/domain/polls/types.js";

const now = new Date("2026-03-13T12:00:00.000Z");

export function createPollRecord(
  overrides: Partial<PollRecord> = {},
): PollRecord {
  return {
    id: "poll_1",
    workspaceId: "workspace_1",
    channelId: "C123",
    messageTs: "12345.6789",
    messagePermalink: "https://slack.com/message",
    creatorUserId: "U_CREATOR",
    question: "What should we ship next?",
    description: "Pick the most important feature.",
    status: "open",
    isAnonymous: false,
    allowsMultipleChoices: false,
    allowVoteChanges: true,
    allowOptionAdditions: false,
    resultsVisibility: "always_visible",
    closesAt: new Date("2026-03-14T12:00:00.000Z"),
    closedAt: null,
    closedByUserId: null,
    closeReason: null,
    sourceType: "slash_command",
    sourceChannelId: "C123",
    sourceMessageTs: null,
    needsSlackSync: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createPollOptions(
  overrides: Partial<PollOptionRecord>[] = [],
): PollOptionRecord[] {
  const defaults: PollOptionRecord[] = [
    {
      id: "opt_1",
      pollId: "poll_1",
      position: 0,
      text: "Option A",
      createdByUserId: "U_CREATOR",
      isActive: true,
      createdAt: now,
    },
    {
      id: "opt_2",
      pollId: "poll_1",
      position: 1,
      text: "Option B",
      createdByUserId: "U_CREATOR",
      isActive: true,
      createdAt: now,
    },
  ];

  return defaults.map((option, index) => ({
    ...option,
    ...overrides[index],
  }));
}

export function createVotes(
  overrides: Partial<VoteRecord>[] = [],
): VoteRecord[] {
  const defaults: VoteRecord[] = [
    {
      id: "vote_1",
      pollId: "poll_1",
      pollOptionId: "opt_1",
      voterUserId: "U_1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "vote_2",
      pollId: "poll_1",
      pollOptionId: "opt_2",
      voterUserId: "U_2",
      createdAt: now,
      updatedAt: now,
    },
  ];

  return overrides.length > defaults.length
    ? overrides.map((override, index) => ({
        ...(defaults[index] ?? {
          id: `vote_${index + 1}`,
          pollId: "poll_1",
          pollOptionId: "opt_1",
          voterUserId: `U_${index + 1}`,
          createdAt: now,
          updatedAt: now,
        }),
        ...override,
      }))
    : defaults.map((vote, index) => ({
        ...vote,
        ...overrides[index],
      }));
}

export function createPollSnapshot(
  overrides: {
    options?: Partial<PollOptionRecord>[];
    poll?: Partial<PollRecord>;
    votes?: Partial<VoteRecord>[];
  } = {},
): PollSnapshot {
  return {
    poll: createPollRecord(overrides.poll),
    options: createPollOptions(overrides.options),
    votes: createVotes(overrides.votes),
  };
}
