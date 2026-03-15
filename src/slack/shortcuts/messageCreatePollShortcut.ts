import type { App } from "@slack/bolt";

import type { SlackMessageShortcutBody } from "../../types/slack.js";
import { slackShortcutIds } from "../ids.js";
import { buildPollCreateView } from "../views/pollCreateView.js";

export function registerMessageCreatePollShortcut(app: App) {
  app.shortcut(
    slackShortcutIds.createFromMessage,
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const shortcutBody = body as unknown as SlackMessageShortcutBody;

        if (!shortcutBody.team?.id) {
          return;
        }

        const messageText = shortcutBody.message.text?.trim() ?? "";

        await client.views.open({
          trigger_id: shortcutBody.trigger_id,
          view: buildPollCreateView({
            initialDescription: messageText.length > 0 ? messageText : null,
            initialQuestion: null,
            optionCount: 2,
            sourceConversationId: shortcutBody.channel.id,
            sourceMessageTs: shortcutBody.message.ts,
            sourceType: "message_shortcut",
            teamId: shortcutBody.team.id,
          }),
        });
      } catch (error) {
        logger.error({ err: error }, "Failed to open message shortcut modal.");
      }
    },
  );
}
