import type { KnownBlock } from "@slack/types";

import type { PollRecord } from "../../domain/polls/types.js";
import { slackActionIds, slackCommandIds } from "../ids.js";

export interface AppHomeViewModel {
  filter: "open" | "closed";
  manageablePolls: PollRecord[];
  recentPolls: PollRecord[];
}

/**
 * Builds App Home blocks for poll discovery and management.
 */
export function buildAppHomeBlocks(viewModel: AppHomeViewModel): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Polls",
        emoji: true,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: slackActionIds.homeCreatePoll,
          style: "primary",
          text: {
            type: "plain_text",
            text: "Create poll",
            emoji: true,
          },
          value: "create",
        },
        {
          type: "button",
          action_id: slackActionIds.homeSetFilter,
          text: {
            type: "plain_text",
            text: "Open",
            emoji: true,
          },
          value: "open",
        },
        {
          type: "button",
          action_id: slackActionIds.homeSetFilter,
          text: {
            type: "plain_text",
            text: "Closed",
            emoji: true,
          },
          value: "closed",
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Use the \`${slackCommandIds.poll}\` slash command, the global shortcut, or the button above to create a new poll.`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Your recent polls*",
      },
    },
    ...buildPollSummaryBlocks(viewModel.recentPolls, "You have not created any polls yet."),
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Polls you can manage*",
      },
    },
    ...buildPollSummaryBlocks(viewModel.manageablePolls, "No manageable polls found."),
  ];

  return blocks;
}

function buildPollSummaryBlocks(polls: PollRecord[], emptyMessage: string): KnownBlock[] {
  if (polls.length === 0) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: emptyMessage,
        },
      },
    ];
  }

  return polls.flatMap((poll) => [
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: [
          `*${poll.question}*`,
          `Status: ${poll.status}`,
          poll.messagePermalink !== null ? `<${poll.messagePermalink}|Open poll message>` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      },
    },
  ]);
}
