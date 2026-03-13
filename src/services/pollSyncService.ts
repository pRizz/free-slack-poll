import type { PollStore, SlackMessagePublisher } from "./ports.js";
import { renderPollMessage } from "./pollRenderService.js";

export interface PollSyncDependencies {
  pollStore: PollStore;
  slackMessagePublisher: SlackMessagePublisher;
}

export class PollSyncService {
  constructor(private readonly dependencies: PollSyncDependencies) {}

  async syncPoll(pollId: string) {
    const snapshot = await this.dependencies.pollStore.findSnapshotById(pollId);

    if (
      snapshot === null ||
      snapshot.poll.channelId === null ||
      snapshot.poll.messageTs === null
    ) {
      return false;
    }

    const renderedMessage = renderPollMessage(snapshot);

    await this.dependencies.slackMessagePublisher.updatePollMessage({
      blocks: renderedMessage.blocks,
      channelId: snapshot.poll.channelId,
      messageTs: snapshot.poll.messageTs,
      text: renderedMessage.text,
    });
    await this.dependencies.pollStore.markSlackSyncState(pollId, false);

    return true;
  }
}
