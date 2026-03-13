import type { App } from "@slack/bolt";

import { pollLimits } from "../../config/constants.js";
import type { SlackButtonActionBody } from "../../types/slack.js";
import { buildPollCreateView } from "../views/pollCreateView.js";
import { decodePollModalMetadata, encodePollModalMetadata } from "../metadata/pollModalMetadata.js";
import { extractPollFormValues } from "../views/pollSubmissionParser.js";
import { slackActionIds } from "../ids.js";

export function registerPollModalActions(app: App) {
  app.action(slackActionIds.addOptionRow, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const actionBody = body as unknown as SlackButtonActionBody;

      if (!actionBody.view) {
        return;
      }

      const metadata = decodePollModalMetadata(actionBody.view.private_metadata);

      if (metadata.optionCount >= pollLimits.maxOptionCount) {
        return;
      }

      const updatedMetadata = {
        ...metadata,
        optionCount: metadata.optionCount + 1,
      };
      const values = extractPollFormValues(actionBody.view.state.values, metadata);

      await client.views.update({
        hash: actionBody.view.hash,
        view: {
          ...buildPollCreateView(updatedMetadata, values),
          private_metadata: encodePollModalMetadata(updatedMetadata),
        },
        view_id: actionBody.view.id,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to add poll option row.");
    }
  });

  app.action(slackActionIds.removeOptionRow, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const actionBody = body as unknown as SlackButtonActionBody;

      if (!actionBody.view) {
        return;
      }

      const metadata = decodePollModalMetadata(actionBody.view.private_metadata);

      if (metadata.optionCount <= pollLimits.minOptionCount) {
        return;
      }

      const updatedMetadata = {
        ...metadata,
        optionCount: metadata.optionCount - 1,
      };
      const values = extractPollFormValues(actionBody.view.state.values, metadata);
      values.optionTexts = values.optionTexts.slice(0, updatedMetadata.optionCount);

      await client.views.update({
        hash: actionBody.view.hash,
        view: {
          ...buildPollCreateView(updatedMetadata, values),
          private_metadata: encodePollModalMetadata(updatedMetadata),
        },
        view_id: actionBody.view.id,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to remove poll option row.");
    }
  });
}
