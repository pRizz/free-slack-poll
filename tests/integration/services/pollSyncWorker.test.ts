import { describe, expect, it } from "vitest";

import { PollSyncWorker } from "../../../src/jobs/pollSyncWorker.js";
import { PollPostingService } from "../../../src/services/pollPostingService.js";
import { PollCreationService } from "../../../src/services/pollCreationService.js";
import { PollSyncService } from "../../../src/services/pollSyncService.js";
import {
  InMemoryPollEventStore,
  InMemoryPollStore,
  InMemorySlackMessagePublisher,
  InMemoryWorkspaceStore,
  SequentialIdGenerator,
} from "../../helpers/inMemoryPorts.js";
import { createTestLogger } from "../../helpers/testLogger.js";

describe("PollSyncWorker", () => {
  it("syncs pending poll messages and clears the pending flag", async () => {
    const clock = {
      now() {
        return new Date("2026-03-13T10:00:00.000Z");
      },
    };
    const pollStore = new InMemoryPollStore();
    const workspaceStore = new InMemoryWorkspaceStore();
    const pollEventStore = new InMemoryPollEventStore();
    const slackMessagePublisher = new InMemorySlackMessagePublisher();
    const creationService = new PollCreationService(
      {
        idGenerator: new SequentialIdGenerator(),
        pollEventStore,
        pollStore,
        workspaceStore,
      },
      clock,
    );
    const postingService = new PollPostingService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });
    const syncService = new PollSyncService({
      pollStore,
      slackMessagePublisher,
    });
    const worker = new PollSyncWorker({
      logger: createTestLogger(),
      pollStore,
      pollSyncService: syncService,
    });

    const createdPoll = await creationService.createPoll({
      allowOptionAdditions: false,
      allowsMultipleChoices: false,
      allowVoteChanges: true,
      closesAt: null,
      creatorUserId: "U_CREATOR",
      isAnonymous: false,
      options: ["Alpha", "Beta"],
      question: "Sync me",
      resultsVisibility: "always_visible",
      sourceType: "slash_command",
      targetConversationId: "C_123",
      teamId: "T_1",
      workspaceId: "T_1",
    });

    await postingService.postPoll(
      createdPoll.pollId,
      createdPoll.targetConversationId,
    );
    await pollStore.markSlackSyncState(createdPoll.pollId, true);

    const syncedPollCount = await worker.runOnce();
    const snapshot = await pollStore.findSnapshotById(createdPoll.pollId);

    expect(syncedPollCount).toBe(1);
    expect(snapshot?.poll.needsSlackSync).toBe(false);
    expect(slackMessagePublisher.updatedMessages).toHaveLength(1);
  });

  it("continues syncing later polls after an earlier sync failure", async () => {
    const pollStore = new InMemoryPollStore();

    await pollStore.createPollWithOptions({
      options: [
        {
          createdByUserId: "U_CREATOR",
          id: "opt_1",
          pollId: "poll_fail",
          position: 0,
          text: "A",
        },
        {
          createdByUserId: "U_CREATOR",
          id: "opt_2",
          pollId: "poll_fail",
          position: 1,
          text: "B",
        },
      ],
      poll: {
        allowOptionAdditions: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        channelId: "C_FAIL",
        creatorUserId: "U_CREATOR",
        id: "poll_fail",
        isAnonymous: false,
        needsSlackSync: true,
        question: "Fail sync",
        resultsVisibility: "always_visible",
        sourceType: "slash_command",
        status: "open",
        workspaceId: "T_1",
      },
    });
    await pollStore.updateMessageReference("poll_fail", {
      channelId: "C_FAIL",
      messageTs: "1",
    });
    await pollStore.markSlackSyncState("poll_fail", true);

    await pollStore.createPollWithOptions({
      options: [
        {
          createdByUserId: "U_CREATOR",
          id: "opt_3",
          pollId: "poll_success",
          position: 0,
          text: "A",
        },
        {
          createdByUserId: "U_CREATOR",
          id: "opt_4",
          pollId: "poll_success",
          position: 1,
          text: "B",
        },
      ],
      poll: {
        allowOptionAdditions: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        channelId: "C_SUCCESS",
        creatorUserId: "U_CREATOR",
        id: "poll_success",
        isAnonymous: false,
        needsSlackSync: true,
        question: "Sync success",
        resultsVisibility: "always_visible",
        sourceType: "slash_command",
        status: "open",
        workspaceId: "T_1",
      },
    });
    await pollStore.updateMessageReference("poll_success", {
      channelId: "C_SUCCESS",
      messageTs: "2",
    });
    await pollStore.markSlackSyncState("poll_success", true);

    const attemptedPollIds: string[] = [];
    const worker = new PollSyncWorker({
      logger: createTestLogger(),
      pollStore,
      pollSyncService: {
        async syncPoll(pollId: string) {
          attemptedPollIds.push(pollId);

          if (pollId === "poll_fail") {
            throw new Error("boom");
          }

          await pollStore.markSlackSyncState(pollId, false);

          return true;
        },
      } as unknown as PollSyncService,
    });

    const syncedPollCount = await worker.runOnce();

    expect(syncedPollCount).toBe(1);
    expect(attemptedPollIds).toEqual(["poll_fail", "poll_success"]);
    expect(
      (await pollStore.findSnapshotById("poll_fail"))?.poll.needsSlackSync,
    ).toBe(true);
    expect(
      (await pollStore.findSnapshotById("poll_success"))?.poll.needsSlackSync,
    ).toBe(false);
  });
});
