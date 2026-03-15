import {
  applyVoteRules,
  type VoteMutationResult,
} from "../domain/votes/voteRules.js";
import { NotFoundError } from "../errors/domainErrors.js";
import type {
  PollEventStore,
  PollStore,
  SlackMessagePublisher,
  VoteStore,
} from "./ports.js";
import { renderPollMessage } from "./pollRenderService.js";

export interface VoteServiceDependencies {
  pollEventStore: PollEventStore;
  pollStore: PollStore;
  slackMessagePublisher: SlackMessagePublisher;
  voteStore: VoteStore;
}

export type VoteServiceResult =
  | {
      code: string;
      kind: "error";
      message: string;
    }
  | {
      kind: "success";
      message: string;
      syncPending: boolean;
    };

export class VoteService {
  constructor(private readonly dependencies: VoteServiceDependencies) {}

  async castVote(
    pollId: string,
    optionId: string,
    voterUserId: string,
  ): Promise<VoteServiceResult> {
    const snapshot = await this.dependencies.pollStore.findSnapshotById(pollId);

    if (snapshot === null) {
      throw new NotFoundError("Poll not found.", {
        pollId,
      });
    }

    const currentVotes =
      await this.dependencies.voteStore.listVotesForPollAndUser(
        pollId,
        voterUserId,
      );
    const voteResult = applyVoteRules({
      currentOptionIds: currentVotes.map((vote) => vote.pollOptionId),
      optionId,
      poll: snapshot.poll,
      validOptionIds: snapshot.options
        .filter((option) => option.isActive)
        .map((option) => option.id),
    });

    if (voteResult.kind === "error") {
      return voteResult;
    }

    await this.dependencies.voteStore.applyVoteMutation({
      addedOptionIds: voteResult.addedOptionIds,
      pollId,
      removedOptionIds: voteResult.removedOptionIds,
      voterUserId,
    });
    await this.dependencies.pollStore.markSlackSyncState(pollId, true);
    await this.dependencies.pollEventStore.append({
      actorUserId: voterUserId,
      eventType: deriveVoteEventType(voteResult),
      payload: {
        addedOptionIds: voteResult.addedOptionIds,
        removedOptionIds: voteResult.removedOptionIds,
      },
      pollId,
    });

    const updatedSnapshot =
      await this.dependencies.pollStore.findSnapshotById(pollId);

    if (
      updatedSnapshot === null ||
      updatedSnapshot.poll.channelId === null ||
      updatedSnapshot.poll.messageTs === null
    ) {
      return {
        kind: "success",
        message: voteResult.message,
        syncPending: false,
      };
    }

    try {
      const renderedMessage = renderPollMessage(updatedSnapshot);

      await this.dependencies.slackMessagePublisher.updatePollMessage({
        blocks: renderedMessage.blocks,
        channelId: updatedSnapshot.poll.channelId,
        messageTs: updatedSnapshot.poll.messageTs,
        text: renderedMessage.text,
      });
      await this.dependencies.pollStore.markSlackSyncState(pollId, false);

      return {
        kind: "success",
        message: voteResult.message,
        syncPending: false,
      };
    } catch {
      return {
        kind: "success",
        message: voteResult.message,
        syncPending: true,
      };
    }
  }
}

function deriveVoteEventType(
  result: Extract<VoteMutationResult, { kind: "success" }>,
) {
  if (result.addedOptionIds.length > 0 && result.removedOptionIds.length > 0) {
    return "vote_changed";
  }

  if (result.removedOptionIds.length > 0) {
    return "vote_removed";
  }

  return "vote_cast";
}
