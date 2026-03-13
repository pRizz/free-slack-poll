import type { App } from "@slack/bolt";

import type { VoteService } from "../../services/voteService.js";
import type { SlackButtonActionBody } from "../../types/slack.js";
import { postEphemeralMessage } from "../responders/ephemeral.js";
import { slackActionIds } from "../ids.js";

export function registerPollVoteAction(app: App, voteService: VoteService) {
  app.action(slackActionIds.vote, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const actionBody = body as unknown as SlackButtonActionBody;
      const action = actionBody.actions[0];

      if (!action || !("value" in action) || typeof action.value !== "string") {
        return;
      }

      const parsedValue = JSON.parse(action.value) as {
        optionId?: string;
        pollId?: string;
      };

      if (
        typeof parsedValue.pollId !== "string" ||
        typeof parsedValue.optionId !== "string" ||
        actionBody.channel === undefined
      ) {
        return;
      }

      const result = await voteService.castVote(
        parsedValue.pollId,
        parsedValue.optionId,
        actionBody.user.id,
      );

      if (result.kind === "error" || result.syncPending) {
        await postEphemeralMessage(client, {
          channelId: actionBody.channel.id,
          text:
            result.kind === "error"
              ? result.message
              : `${result.message} The shared message will refresh shortly.`,
          userId: actionBody.user.id,
        });
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to handle poll vote action.");

      const actionBody = body as unknown as SlackButtonActionBody;

      if (actionBody.channel !== undefined) {
        await postEphemeralMessage(client, {
          channelId: actionBody.channel.id,
          text: "Something went wrong while recording your vote.",
          userId: actionBody.user.id,
        });
      }
    }
  });
}
