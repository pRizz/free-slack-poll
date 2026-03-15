import type { KnownBlock } from "@slack/types";

import type { PollDetailViewModel } from "../../domain/polls/types.js";

/**
 * Builds detailed poll result blocks for a modal or ephemeral response.
 */
export function buildPollResultsBlocks(
  viewModel: PollDetailViewModel,
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: truncatePlainText(viewModel.title),
        emoji: true,
      },
    },
  ];

  if (viewModel.metadataLines.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ["*Metadata*", ...viewModel.metadataLines].join("\n"),
      },
    });
  }

  for (const section of viewModel.sections) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [`*${section.heading}*`, ...section.lines].join("\n"),
      },
    });
  }

  return blocks;
}

function truncatePlainText(value: string) {
  return value.length <= 150 ? value : `${value.slice(0, 147)}...`;
}
