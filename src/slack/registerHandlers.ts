import type { App } from "@slack/bolt";

import type { AppHomeService } from "../services/appHomeService.js";
import type { AuthorizationService } from "../services/authorizationService.js";
import type { PollCloseService } from "../services/pollCloseService.js";
import type { PollCreationService } from "../services/pollCreationService.js";
import type { PollPostingService } from "../services/pollPostingService.js";
import type { PollStore } from "../services/ports.js";
import type { VoteService } from "../services/voteService.js";
import { registerPollCommand } from "./commands/pollCommand.js";
import { registerPollManageActions } from "./actions/pollManageAction.js";
import { registerPollModalActions } from "./actions/pollModalAction.js";
import { registerPollVoteAction } from "./actions/pollVoteAction.js";
import { registerAppHomeOpenedHandler } from "./home/appHomeOpenedHandler.js";
import { registerGlobalNewPollShortcut } from "./shortcuts/globalNewPollShortcut.js";
import { registerMessageCreatePollShortcut } from "./shortcuts/messageCreatePollShortcut.js";
import { registerPollCreateSubmissionHandler } from "./views/pollCreateSubmissionHandler.js";

export interface SlackHandlerDependencies {
  appHomeService: AppHomeService;
  authorizationService: AuthorizationService;
  pollCloseService: PollCloseService;
  pollCreationService: PollCreationService;
  pollPostingService: PollPostingService;
  pollStore: PollStore;
  voteService: VoteService;
}

/**
 * Registers Slack handlers on the Bolt app instance.
 */
export function registerHandlers(app: App, dependencies: SlackHandlerDependencies) {
  registerPollCommand(app);
  registerGlobalNewPollShortcut(app);
  registerMessageCreatePollShortcut(app);
  registerPollModalActions(app);
  registerPollCreateSubmissionHandler(app, {
    pollCreationService: dependencies.pollCreationService,
    pollPostingService: dependencies.pollPostingService,
  });
  registerPollVoteAction(app, dependencies.voteService);
  registerPollManageActions(app, {
    appHomeService: dependencies.appHomeService,
    authorizationService: dependencies.authorizationService,
    pollCloseService: dependencies.pollCloseService,
    pollStore: dependencies.pollStore,
  });
  registerAppHomeOpenedHandler(app, dependencies.appHomeService);
}
