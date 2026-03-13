import type { App } from "@slack/bolt";

import { ValidationError } from "../../errors/domainErrors.js";
import type { PollCreationService } from "../../services/pollCreationService.js";
import type { PollPostingService } from "../../services/pollPostingService.js";
import type { SlackViewStateValues } from "../../types/slack.js";
import { slackBlockIds, slackViewIds } from "../ids.js";
import { decodePollModalMetadata } from "../metadata/pollModalMetadata.js";
import { parseCreatePollInput } from "./pollSubmissionParser.js";

export interface PollCreateSubmissionDependencies {
  pollCreationService: PollCreationService;
  pollPostingService: PollPostingService;
}

export function registerPollCreateSubmissionHandler(
  app: App,
  dependencies: PollCreateSubmissionDependencies,
) {
  app.view(slackViewIds.createPoll, async ({ ack, body, logger }) => {
    try {
      const metadata = decodePollModalMetadata(body.view.private_metadata);
      const createPollInput = parseCreatePollInput(
        body.view.state.values as unknown as SlackViewStateValues,
        metadata,
        body.user.id,
      );
      const createdPoll = await dependencies.pollCreationService.createPoll({
        ...createPollInput,
        teamId: metadata.teamId,
      });

      await dependencies.pollPostingService.postPoll(
        createdPoll.pollId,
        createdPoll.targetConversationId,
      );
      await ack({
        response_action: "clear",
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to create poll.");

      if (error instanceof ValidationError) {
        await ack({
          response_action: "errors",
          errors: mapValidationErrorToViewErrors(error.message),
        });

        return;
      }

      await ack({
        response_action: "errors",
        errors: {
          [slackBlockIds.question]:
            "Unable to create this poll right now. Verify the channel is valid and the app is installed there.",
        },
      });
    }
  });
}

function mapValidationErrorToViewErrors(message: string) {
  if (message.includes("target conversation")) {
    return {
      [slackBlockIds.targetConversation]: message,
    };
  }

  if (message.includes("option")) {
    return {
      [`${slackBlockIds.optionRow}_0`]: message,
    };
  }

  if (message.includes("close time")) {
    return {
      [slackBlockIds.closeAt]: message,
    };
  }

  return {
    [slackBlockIds.question]: message,
  };
}
