import { describe, expect, it } from "vitest";

import { PollCloseWorker } from "../../../src/jobs/pollCloseWorker.js";
import { AuthorizationService } from "../../../src/services/authorizationService.js";
import { PollCloseService } from "../../../src/services/pollCloseService.js";
import {
  InMemoryPollEventStore,
  InMemoryPollStore,
  InMemorySlackMessagePublisher,
  InMemoryWorkspaceStore,
  SequentialIdGenerator,
} from "../../helpers/inMemoryPorts.js";
import { createTestLogger } from "../../helpers/testLogger.js";
import { PollCreationService } from "../../../src/services/pollCreationService.js";
import { PollPostingService } from "../../../src/services/pollPostingService.js";

describe("PollCloseWorker", () => {
  it("closes overdue polls and syncs the Slack message", async () => {
    const creationClock = {
      now() {
        return new Date("2026-03-13T10:00:00.000Z");
      },
    };
    const workerClock = {
      now() {
        return new Date("2026-03-13T12:00:00.000Z");
      },
    };
    const pollStore = new InMemoryPollStore();
    const workspaceStore = new InMemoryWorkspaceStore();
    const pollEventStore = new InMemoryPollEventStore();
    const slackMessagePublisher = new InMemorySlackMessagePublisher();
    const authorizationService = new AuthorizationService([]);
    const idGenerator = new SequentialIdGenerator();
    const creationService = new PollCreationService(
      {
        idGenerator,
        pollEventStore,
        pollStore,
        workspaceStore,
      },
      creationClock,
    );
    const postingService = new PollPostingService({
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });
    const closeService = new PollCloseService({
      authorizationService,
      clock: workerClock,
      pollEventStore,
      pollStore,
      slackMessagePublisher,
    });
    const worker = new PollCloseWorker({
      clock: workerClock,
      logger: createTestLogger(),
      pollCloseService: closeService,
      pollStore,
    });

    const createdPoll = await creationService.createPoll({
      allowOptionAdditions: false,
      allowsMultipleChoices: false,
      allowVoteChanges: true,
      closesAt: new Date("2026-03-13T11:00:00.000Z"),
      creatorUserId: "U_CREATOR",
      isAnonymous: false,
      options: ["Alpha", "Beta"],
      question: "Auto close me",
      resultsVisibility: "always_visible",
      sourceType: "slash_command",
      targetConversationId: "C_123",
      teamId: "T_1",
      workspaceId: "T_1",
    });

    await postingService.postPoll(createdPoll.pollId, createdPoll.targetConversationId);

    const closedPollCount = await worker.runOnce();
    const snapshot = await pollStore.findSnapshotById(createdPoll.pollId);

    expect(closedPollCount).toBe(1);
    expect(snapshot?.poll.status).toBe("closed");
    expect(slackMessagePublisher.updatedMessages).toHaveLength(1);
  });

  it("continues processing other due polls after one close failure", async () => {
    const workerClock = {
      now() {
        return new Date("2026-03-13T12:00:00.000Z");
      },
    };
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
        closesAt: new Date("2026-03-13T11:00:00.000Z"),
        creatorUserId: "U_CREATOR",
        id: "poll_fail",
        isAnonymous: false,
        question: "Should fail",
        resultsVisibility: "always_visible",
        sourceType: "slash_command",
        workspaceId: "T_1",
      },
    });
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
        closesAt: new Date("2026-03-13T11:30:00.000Z"),
        creatorUserId: "U_CREATOR",
        id: "poll_success",
        isAnonymous: false,
        question: "Should succeed",
        resultsVisibility: "always_visible",
        sourceType: "slash_command",
        workspaceId: "T_1",
      },
    });

    const attemptedPollIds: string[] = [];
    const worker = new PollCloseWorker({
      clock: workerClock,
      logger: createTestLogger(),
      pollCloseService: {
        async closePoll(input: { pollId: string }) {
          attemptedPollIds.push(input.pollId);

          if (input.pollId === "poll_fail") {
            throw new Error("boom");
          }

          await pollStore.closePoll(input.pollId, {
            closeReason: "scheduled",
            closedAt: workerClock.now(),
          });

          return {
            syncPending: false,
          };
        },
      } as unknown as PollCloseService,
      pollStore,
    });

    const closedPollCount = await worker.runOnce();

    expect(closedPollCount).toBe(1);
    expect(attemptedPollIds).toEqual(["poll_fail", "poll_success"]);
    expect((await pollStore.findSnapshotById("poll_fail"))?.poll.status).toBe("open");
    expect((await pollStore.findSnapshotById("poll_success"))?.poll.status).toBe("closed");
  });
});
