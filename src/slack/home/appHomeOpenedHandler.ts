import type { App } from "@slack/bolt";

import type { AppHomeService } from "../../services/appHomeService.js";

export function registerAppHomeOpenedHandler(app: App, appHomeService: AppHomeService) {
  app.event("app_home_opened", async ({ context, event, logger }) => {
    try {
      if (!context.teamId) {
        return;
      }

      await appHomeService.publishHome({
        filter: "open",
        userId: event.user,
        workspaceId: context.teamId,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to publish App Home.");
    }
  });
}
