import { closePollState } from "../domain/polls/pollLifecycle.js";
import { AuthorizationError, NotFoundError } from "../errors/domainErrors.js";
import type { Clock } from "../lib/clock.js";
import type { PollCloseReason } from "../domain/polls/types.js";
import type { AuthorizationService } from "./authorizationService.js";
import type {
  PollEventStore,
  PollStore,
  SlackMessagePublisher,
} from "./ports.js";
import { renderPollMessage } from "./pollRenderService.js";

export interface PollCloseDependencies {
  authorizationService: AuthorizationService;
  clock: Clock;
  pollEventStore: PollEventStore;
  pollStore: PollStore;
  slackMessagePublisher: SlackMessagePublisher;
}

export interface ClosePollRequest {
  actorUserId?: string | null;
  closeReason: PollCloseReason;
  pollId: string;
}

export class PollCloseService {
  constructor(private readonly dependencies: PollCloseDependencies) {}

  async closePoll(request: ClosePollRequest) {
    const snapshot = await this.dependencies.pollStore.findSnapshotById(
      request.pollId,
    );

    if (snapshot === null) {
      throw new NotFoundError("Poll not found.", {
        pollId: request.pollId,
      });
    }

    if (
      request.actorUserId !== null &&
      request.actorUserId !== undefined &&
      !this.dependencies.authorizationService.canClosePoll(
        snapshot.poll,
        request.actorUserId,
      )
    ) {
      throw new AuthorizationError();
    }

    const closeState = closePollState(
      snapshot.poll,
      this.dependencies.clock.now(),
      request.closeReason,
      request.actorUserId ?? null,
    );

    await this.dependencies.pollStore.closePoll(request.pollId, closeState);
    await this.dependencies.pollEventStore.append({
      actorUserId: request.actorUserId ?? null,
      eventType: "poll_closed",
      payload: {
        closeReason: request.closeReason,
      },
      pollId: request.pollId,
    });

    const updatedSnapshot = await this.dependencies.pollStore.findSnapshotById(
      request.pollId,
    );

    if (
      updatedSnapshot === null ||
      updatedSnapshot.poll.channelId === null ||
      updatedSnapshot.poll.messageTs === null
    ) {
      return {
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
      await this.dependencies.pollStore.markSlackSyncState(
        request.pollId,
        false,
      );

      return {
        syncPending: false,
      };
    } catch {
      return {
        syncPending: true,
      };
    }
  }
}
