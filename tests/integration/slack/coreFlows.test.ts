import { describe, expect, it } from "vitest";

import { systemClock } from "../../../src/lib/clock.js";
import { AuthorizationService } from "../../../src/services/authorizationService.js";
import { PollCloseService } from "../../../src/services/pollCloseService.js";
import { PollCreationService } from "../../../src/services/pollCreationService.js";
import { PollPostingService } from "../../../src/services/pollPostingService.js";
import { VoteService } from "../../../src/services/voteService.js";
import {
  InMemoryPollEventStore,
  InMemoryPollStore,
  InMemorySlackMessagePublisher,
  InMemoryVoteStore,
  InMemoryWorkspaceStore,
  SequentialIdGenerator,
} from "../../helpers/inMemoryPorts.js";

describe("core Slack poll flows", () => {
  it("creates, posts, and updates a single-choice poll", async () => {
    const pollStore = new InMemoryPollStore();
    const workspaceStore = new InMemoryWorkspaceStore();
    const pollEventStore = new InMemoryPollEventStore();
    const slackMessagePublisher = new InMemorySlackMessagePublisher();
    const voteStore = new InMemoryVoteStore(pollStore);
    const idGenerator = new SequentialIdGenerator();
    const creationService = new PollCreationService(
      {
        idGenerator,
        pollEventStore,
        pollStore,
        workspaceStore,
      },
      systemClock,
    );
    const postingService = new PollPostingService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });
    const voteService = new VoteService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
      voteStore,
    });

    const createdPoll = await creationService.createPoll({
      allowOptionAdditions: false,
      allowsMultipleChoices: false,
      allowVoteChanges: true,
      closesAt: null,
      creatorUserId: "U_CREATOR",
      description: "Choose the next launch.",
      isAnonymous: false,
      options: ["Alpha", "Beta"],
      question: "What should we launch?",
      resultsVisibility: "always_visible",
      sourceType: "slash_command",
      targetConversationId: "C_123",
      teamId: "T_1",
      workspaceId: "T_1",
    });

    await postingService.postPoll(createdPoll.pollId, createdPoll.targetConversationId);

    const snapshot = await pollStore.findSnapshotById(createdPoll.pollId);
    const optionId = snapshot?.options[0]?.id;

    expect(optionId).toBeDefined();

    const voteResult = await voteService.castVote(createdPoll.pollId, optionId ?? "", "U_VOTER");

    expect(voteResult).toEqual({
      kind: "success",
      message: "Your vote was recorded.",
      syncPending: false,
    });
    expect(slackMessagePublisher.postedMessages).toHaveLength(1);
    expect(slackMessagePublisher.updatedMessages).toHaveLength(1);
    expect(JSON.stringify(slackMessagePublisher.updatedMessages[0]?.blocks)).toContain("1 votes");
  });

  it("keeps results hidden until close and then reveals them", async () => {
    const pollStore = new InMemoryPollStore();
    const workspaceStore = new InMemoryWorkspaceStore();
    const pollEventStore = new InMemoryPollEventStore();
    const slackMessagePublisher = new InMemorySlackMessagePublisher();
    const voteStore = new InMemoryVoteStore(pollStore);
    const idGenerator = new SequentialIdGenerator();
    const authorizationService = new AuthorizationService([]);
    const creationService = new PollCreationService(
      {
        idGenerator,
        pollEventStore,
        pollStore,
        workspaceStore,
      },
      systemClock,
    );
    const postingService = new PollPostingService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });
    const voteService = new VoteService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
      voteStore,
    });
    const closeService = new PollCloseService({
      authorizationService,
      clock: systemClock,
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });

    const createdPoll = await creationService.createPoll({
      allowOptionAdditions: false,
      allowsMultipleChoices: false,
      allowVoteChanges: true,
      closesAt: null,
      creatorUserId: "U_CREATOR",
      isAnonymous: false,
      options: ["Alpha", "Beta"],
      question: "What should we launch?",
      resultsVisibility: "hidden_until_closed",
      sourceType: "slash_command",
      targetConversationId: "C_123",
      teamId: "T_1",
      workspaceId: "T_1",
    });

    await postingService.postPoll(createdPoll.pollId, createdPoll.targetConversationId);

    const snapshot = await pollStore.findSnapshotById(createdPoll.pollId);
    const optionId = snapshot?.options[0]?.id ?? "";

    await voteService.castVote(createdPoll.pollId, optionId, "U_VOTER");

    expect(JSON.stringify(slackMessagePublisher.updatedMessages[0]?.blocks)).not.toContain("1 votes");

    await closeService.closePoll({
      actorUserId: "U_CREATOR",
      closeReason: "manual",
      pollId: createdPoll.pollId,
    });

    expect(JSON.stringify(slackMessagePublisher.updatedMessages.at(-1)?.blocks)).toContain("1 votes");
  });
});
