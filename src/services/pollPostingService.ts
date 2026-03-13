import { NotFoundError } from "../errors/domainErrors.js";
import type { PollEventStore, PollStore, SlackMessagePublisher } from "./ports.js";
import { renderPollMessage } from "./pollRenderService.js";

export interface PollPostingDependencies {
  pollEventStore: PollEventStore;
  pollStore: PollStore;
  slackMessagePublisher: SlackMessagePublisher;
}

export class PollPostingService {
  constructor(private readonly dependencies: PollPostingDependencies) {}

  async postPoll(pollId: string, channelId: string) {
    const snapshot = await this.dependencies.pollStore.findSnapshotById(pollId);

    if (snapshot === null) {
      throw new NotFoundError("Poll not found.", {
        pollId,
      });
    }

    const renderedMessage = renderPollMessage(snapshot);
    const postedMessage = await this.dependencies.slackMessagePublisher.postPollMessage({
      blocks: renderedMessage.blocks,
      channelId,
      text: renderedMessage.text,
    });

    await this.dependencies.pollStore.updateMessageReference(pollId, {
      channelId: postedMessage.channelId,
      ...(postedMessage.messagePermalink !== undefined
        ? { messagePermalink: postedMessage.messagePermalink }
        : {}),
      messageTs: postedMessage.messageTs,
    });
    await this.dependencies.pollStore.markSlackSyncState(pollId, false);
    await this.dependencies.pollEventStore.append({
      eventType: "poll_posted",
      payload: {
        channelId: postedMessage.channelId,
        messageTs: postedMessage.messageTs,
      },
      pollId,
    });

    return postedMessage;
  }
}
