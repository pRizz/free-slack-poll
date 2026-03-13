import type { KnownBlock } from "@slack/types";

import type { PollMessageViewModel } from "../../domain/polls/types.js";
import { slackActionIds } from "../ids.js";

/**
 * Builds the shared poll message blocks for a posted poll.
 */
export function buildPollMessageBlocks(
  pollId: string,
  viewModel: PollMessageViewModel,
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeMrkdwn(viewModel.question)}*`,
      },
    },
  ];

  if (viewModel.description !== null) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: escapeMrkdwn(viewModel.description),
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Status:* ${viewModel.statusText}`,
      },
      ...viewModel.metadataLines.map((metadataLine) => ({
        type: "mrkdwn" as const,
        text: metadataLine,
      })),
    ],
  });

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: viewModel.resultsSummaryText,
    },
  });

  for (const optionItem of viewModel.optionItems) {
    const lines = [`*${escapeMrkdwn(optionItem.buttonText)}*`];

    if (optionItem.resultText !== null) {
      lines.push(optionItem.resultText);
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: lines.join("\n"),
      },
      accessory: {
        type: "button",
        action_id: slackActionIds.vote,
        text: {
          type: "plain_text",
          text: "Vote",
          emoji: true,
        },
        value: encodeOptionVoteValue(pollId, optionItem.optionId),
      },
    });
  }

  if (viewModel.managementActions.length > 0) {
    blocks.push({
      type: "actions",
      elements: viewModel.managementActions.map((action) => {
        const baseElement = {
          type: "button" as const,
          action_id:
            action.key === "close_poll" ? slackActionIds.closePoll : slackActionIds.viewPollDetails,
          text: {
            type: "plain_text" as const,
            text: action.text,
            emoji: true,
          },
          value: action.value,
        };

        return action.style !== undefined ? { ...baseElement, style: action.style } : baseElement;
      }),
    });
  }

  return blocks;
}

export function encodeOptionVoteValue(pollId: string, optionId: string) {
  return JSON.stringify({
    optionId,
    pollId,
  });
}

function escapeMrkdwn(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
