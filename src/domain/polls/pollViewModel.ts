import { aggregatePollResults } from "./pollResults.js";
import {
  formatSlackChannelMention,
  formatSlackDate,
  formatSlackUserMention,
} from "../../slack/formatting.js";
import type {
  PollDetailViewModel,
  PollMessageViewModel,
  PollRecord,
  PollSnapshot,
  PollSummaryViewModel,
} from "./types.js";

/**
 * Builds a render-friendly poll message view model from authoritative poll state.
 */
export function buildPollMessageViewModel(
  snapshot: PollSnapshot,
): PollMessageViewModel {
  const results = aggregatePollResults(snapshot.options, snapshot.votes);
  const resultsVisible =
    snapshot.poll.resultsVisibility === "always_visible" ||
    snapshot.poll.status === "closed";

  const metadataLines = [
    snapshot.poll.isAnonymous ? "Anonymous poll" : "Named poll",
    snapshot.poll.allowsMultipleChoices ? "Multiple choice" : "Single choice",
    snapshot.poll.allowVoteChanges
      ? "Vote changes allowed"
      : "Vote changes disabled",
  ];

  if (snapshot.poll.closesAt !== null) {
    metadataLines.push(`Closes ${formatSlackDate(snapshot.poll.closesAt)}`);
  }

  const optionItems = results.optionResults.map((optionResult) => ({
    buttonText: optionResult.label,
    optionId: optionResult.optionId,
    resultText: resultsVisible
      ? `${optionResult.voteCount} votes • ${optionResult.votePercentage}%`
      : null,
  }));

  const managementActions: PollMessageViewModel["managementActions"] = [];

  if (snapshot.poll.status === "open") {
    managementActions.unshift({
      key: "close_poll",
      style: "danger",
      text: "Close poll",
      value: snapshot.poll.id,
    });
  }

  if (!snapshot.poll.isAnonymous) {
    managementActions.push({
      key: "view_details",
      text: "View details",
      value: snapshot.poll.id,
    });
  }

  return {
    optionItems,
    metadataLines,
    managementActions,
    question: snapshot.poll.question,
    description: snapshot.poll.description,
    resultsSummaryText: resultsVisible
      ? formatResultsSummary(results.totalVoteCount, results.uniqueVoterCount)
      : "Results are hidden until the poll closes.",
    resultsVisible,
    statusText: snapshot.poll.status === "closed" ? "Closed" : "Open",
  };
}

/**
 * Builds a compact summary model for manager-facing poll lists.
 */
export function buildPollSummaryViewModel(
  poll: PollRecord,
): PollSummaryViewModel {
  return {
    messagePermalink: poll.messagePermalink,
    metadataLines: buildManagerMetadataLines(poll),
    question: poll.question,
    statusText: poll.status,
  };
}

/**
 * Builds a detailed voter-results view model for non-anonymous polls.
 */
export function buildPollDetailViewModel(
  snapshot: PollSnapshot,
): PollDetailViewModel {
  const results = aggregatePollResults(snapshot.options, snapshot.votes);

  return {
    metadataLines: buildManagerMetadataLines(snapshot.poll),
    title: snapshot.poll.question,
    sections: results.optionResults.map((optionResult) => ({
      heading: `${optionResult.label} — ${optionResult.voteCount} votes`,
      lines:
        optionResult.voterIds.length > 0
          ? optionResult.voterIds.map((voterId) => `<@${voterId}>`)
          : ["No votes yet."],
    })),
  };
}

function formatResultsSummary(
  totalVoteCount: number,
  uniqueVoterCount: number,
) {
  return `${totalVoteCount} votes from ${uniqueVoterCount} participant${
    uniqueVoterCount === 1 ? "" : "s"
  }`;
}

function buildManagerMetadataLines(poll: PollRecord) {
  const metadataLines = [
    `Created by ${formatSlackUserMention(poll.creatorUserId)}`,
    `Created ${formatSlackDate(poll.createdAt)}`,
  ];

  if (poll.channelId !== null) {
    metadataLines.push(
      `Posted in ${formatSlackChannelMention(poll.channelId)}`,
    );
  }

  if (poll.status === "open" && poll.closesAt !== null) {
    metadataLines.push(`Closes ${formatSlackDate(poll.closesAt)}`);
  } else if (poll.status === "closed" && poll.closedAt !== null) {
    metadataLines.push(`Closed ${formatSlackDate(poll.closedAt)}`);
  }

  return metadataLines;
}
