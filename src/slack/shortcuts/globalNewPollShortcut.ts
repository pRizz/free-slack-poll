import type { App } from "@slack/bolt";

import { slackShortcutIds } from "../ids.js";
import { buildPollCreateView } from "../views/pollCreateView.js";

export function registerGlobalNewPollShortcut(app: App) {
  app.shortcut(
    slackShortcutIds.createGlobal,
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        if (!body.team?.id) {
          return;
        }

        await client.views.open({
          trigger_id: body.trigger_id,
          view: buildPollCreateView({
            initialDescription: null,
            initialQuestion: null,
            optionCount: 2,
            sourceConversationId: null,
            sourceMessageTs: null,
            sourceType: "global_shortcut",
            teamId: body.team.id,
          }),
        });
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to open global poll shortcut modal.",
        );
      }
    },
  );
}
