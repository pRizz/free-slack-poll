import { aggregatePollResults } from "./pollResults.js";
import type { PollDetailViewModel, PollMessageViewModel, PollSnapshot } from "./types.js";

/**
 * Builds a render-friendly poll message view model from authoritative poll state.
 */
export function buildPollMessageViewModel(snapshot: PollSnapshot): PollMessageViewModel {
  const results = aggregatePollResults(snapshot.options, snapshot.votes);
  const resultsVisible =
    snapshot.poll.resultsVisibility === "always_visible" || snapshot.poll.status === "closed";

  const metadataLines = [
    snapshot.poll.isAnonymous ? "Anonymous poll" : "Named poll",
    snapshot.poll.allowsMultipleChoices ? "Multiple choice" : "Single choice",
    snapshot.poll.allowVoteChanges ? "Vote changes allowed" : "Vote changes disabled",
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

  const managementActions: PollMessageViewModel["managementActions"] = [
    {
      key: "view_details",
      text: "View details",
      value: snapshot.poll.id,
    },
  ];

  if (snapshot.poll.status === "open") {
    managementActions.unshift({
      key: "close_poll",
      style: "danger",
      text: "Close poll",
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
 * Builds a detailed voter-results view model for non-anonymous polls.
 */
export function buildPollDetailViewModel(snapshot: PollSnapshot): PollDetailViewModel {
  const results = aggregatePollResults(snapshot.options, snapshot.votes);

  return {
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

function formatResultsSummary(totalVoteCount: number, uniqueVoterCount: number) {
  return `${totalVoteCount} votes from ${uniqueVoterCount} participant${
    uniqueVoterCount === 1 ? "" : "s"
  }`;
}

function formatSlackDate(value: Date) {
  const unixTimestamp = Math.floor(value.getTime() / 1000);

  return `<!date^${unixTimestamp}^{date_short_pretty} {time}|${value.toISOString()}>`;
}
