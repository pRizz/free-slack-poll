import type { KnownBlock } from "@slack/types";

import {
  buildPollDetailViewModel,
  buildPollMessageViewModel,
} from "../domain/polls/pollViewModel.js";
import type { PollSnapshot } from "../domain/polls/types.js";
import { buildPollMessageBlocks } from "../slack/blocks/pollMessageBlocks.js";
import { buildPollResultsBlocks } from "../slack/blocks/pollResultsBlocks.js";

export interface RenderedSlackMessage {
  blocks: KnownBlock[];
  text: string;
}

/**
 * Renders the poll message for a shared channel message.
 */
export function renderPollMessage(snapshot: PollSnapshot): RenderedSlackMessage {
  const viewModel = buildPollMessageViewModel(snapshot);

  return {
    blocks: buildPollMessageBlocks(snapshot.poll.id, viewModel),
    text: `Poll: ${snapshot.poll.question}`,
  };
}

/**
 * Renders the detailed non-anonymous results view.
 */
export function renderPollDetailMessage(snapshot: PollSnapshot): RenderedSlackMessage {
  const viewModel = buildPollDetailViewModel(snapshot);

  return {
    blocks: buildPollResultsBlocks(viewModel),
    text: `Poll details: ${snapshot.poll.question}`,
  };
}
