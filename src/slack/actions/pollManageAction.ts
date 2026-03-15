import type { App } from "@slack/bolt";

import { AuthorizationError } from "../../errors/domainErrors.js";
import type { AppHomeService } from "../../services/appHomeService.js";
import type { AuthorizationService } from "../../services/authorizationService.js";
import type { PollCloseService } from "../../services/pollCloseService.js";
import type { PollStore } from "../../services/ports.js";
import { renderPollDetailMessage } from "../../services/pollRenderService.js";
import type { SlackButtonActionBody } from "../../types/slack.js";
import { postEphemeralMessage } from "../responders/ephemeral.js";
import { buildPollCreateView } from "../views/pollCreateView.js";
import { slackActionIds } from "../ids.js";

export interface PollManageActionDependencies {
  appHomeService: AppHomeService;
  authorizationService: AuthorizationService;
  pollCloseService: PollCloseService;
  pollStore: PollStore;
}

export function registerPollManageActions(
  app: App,
  dependencies: PollManageActionDependencies,
) {
  app.action(
    slackActionIds.closePoll,
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const actionBody = body as unknown as SlackButtonActionBody;
        const action = actionBody.actions[0];

        if (
          !action ||
          !("value" in action) ||
          typeof action.value !== "string"
        ) {
          return;
        }

        const result = await dependencies.pollCloseService.closePoll({
          actorUserId: actionBody.user.id,
          closeReason: "manual",
          pollId: action.value,
        });

        if (result.syncPending && actionBody.channel !== undefined) {
          await postEphemeralMessage(client, {
            channelId: actionBody.channel.id,
            text: "The poll closed successfully. The shared message will refresh shortly.",
            userId: actionBody.user.id,
          });
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to close poll.");

        const actionBody = body as unknown as SlackButtonActionBody;

        if (actionBody.channel !== undefined) {
          await postEphemeralMessage(client, {
            channelId: actionBody.channel.id,
            text:
              error instanceof AuthorizationError
                ? "Only the poll creator or an app admin can close this poll."
                : "Unable to close this poll right now.",
            userId: actionBody.user.id,
          });
        }
      }
    },
  );

  app.action(
    slackActionIds.viewPollDetails,
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const actionBody = body as unknown as SlackButtonActionBody;
        const action = actionBody.actions[0];

        if (
          !action ||
          !("value" in action) ||
          typeof action.value !== "string" ||
          actionBody.trigger_id === undefined
        ) {
          return;
        }

        const snapshot = await dependencies.pollStore.findSnapshotById(
          action.value,
        );

        if (snapshot === null) {
          return;
        }

        if (
          !dependencies.authorizationService.canViewDetailedVotes(
            snapshot.poll,
            actionBody.user.id,
          )
        ) {
          if (actionBody.channel !== undefined) {
            await postEphemeralMessage(client, {
              channelId: actionBody.channel.id,
              text: snapshot.poll.isAnonymous
                ? "Anonymous polls never expose voter identities."
                : "Only the poll creator or an app admin can view detailed votes.",
              userId: actionBody.user.id,
            });
          }

          return;
        }

        const renderedDetail = renderPollDetailMessage(snapshot);

        await client.views.open({
          trigger_id: actionBody.trigger_id,
          view: {
            type: "modal",
            title: {
              type: "plain_text",
              text: "Poll details",
              emoji: true,
            },
            close: {
              type: "plain_text",
              text: "Close",
              emoji: true,
            },
            blocks: renderedDetail.blocks,
          },
        });
      } catch (error) {
        logger.error({ err: error }, "Failed to open poll details.");
      }
    },
  );

  app.action(
    slackActionIds.homeCreatePoll,
    async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const actionBody = body as unknown as SlackButtonActionBody;

        if (!actionBody.trigger_id || !actionBody.team?.id) {
          return;
        }

        await client.views.open({
          trigger_id: actionBody.trigger_id,
          view: buildPollCreateView({
            initialDescription: null,
            initialQuestion: null,
            optionCount: 2,
            sourceConversationId: null,
            sourceMessageTs: null,
            sourceType: "app_home",
            teamId: actionBody.team.id,
          }),
        });
      } catch (error) {
        logger.error({ err: error }, "Failed to open App Home poll modal.");
      }
    },
  );

  const registerHomeFilterAction = (
    actionId: string,
    filter: "open" | "closed",
  ) => {
    app.action(actionId, async ({ ack, body, logger }) => {
      await ack();

      try {
        const actionBody = body as unknown as SlackButtonActionBody;

        if (!actionBody.team?.id) {
          return;
        }

        await dependencies.appHomeService.publishHome({
          filter,
          userId: actionBody.user.id,
          workspaceId: actionBody.team.id,
        });
      } catch (error) {
        logger.error({ err: error }, "Failed to refresh App Home.");
      }
    });
  };

  registerHomeFilterAction(slackActionIds.homeSetFilterOpen, "open");
  registerHomeFilterAction(slackActionIds.homeSetFilterClosed, "closed");
}
