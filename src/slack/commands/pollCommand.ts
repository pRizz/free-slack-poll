import type { App } from "@slack/bolt";

import { pollLimits } from "../../config/constants.js";
import { slackCommandIds } from "../ids.js";
import { buildPollCreateView } from "../views/pollCreateView.js";

export function registerPollCommand(app: App) {
  app.command(slackCommandIds.poll, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const trimmedText = body.text.trim();
      const initialQuestion =
        trimmedText.length > 0 && trimmedText.length <= pollLimits.maxQuestionLength
          ? trimmedText
          : null;
      const initialDescription =
        trimmedText.length > pollLimits.maxQuestionLength ? trimmedText : null;

      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildPollCreateView({
          initialDescription,
          initialQuestion,
          optionCount: 2,
          sourceConversationId: body.channel_id,
          sourceMessageTs: null,
          sourceType: "slash_command",
          teamId: body.team_id,
        }),
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to open poll command modal.");
    }
  });
}
