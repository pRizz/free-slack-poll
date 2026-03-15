import type {
  AggregatedPollResults,
  PollOptionRecord,
  VoteRecord,
} from "./types.js";

/**
 * Computes aggregate poll results from option and vote records.
 */
export function aggregatePollResults(
  options: PollOptionRecord[],
  votes: VoteRecord[],
): AggregatedPollResults {
  const votesByOptionId = new Map<string, VoteRecord[]>();

  for (const vote of votes) {
    const existingVotes = votesByOptionId.get(vote.pollOptionId) ?? [];
    existingVotes.push(vote);
    votesByOptionId.set(vote.pollOptionId, existingVotes);
  }

  const totalVoteCount = votes.length;
  const uniqueVoterCount = new Set(votes.map((vote) => vote.voterUserId)).size;

  const optionResults = options
    .filter((option) => option.isActive)
    .sort((left, right) => left.position - right.position)
    .map((option) => {
      const optionVotes = votesByOptionId.get(option.id) ?? [];
      const voteCount = optionVotes.length;

      return {
        label: option.text,
        optionId: option.id,
        voteCount,
        votePercentage: calculatePercentage(voteCount, totalVoteCount),
        voterIds: optionVotes.map((vote) => vote.voterUserId).sort(),
      };
    });

  return {
    optionResults,
    totalVoteCount,
    uniqueVoterCount,
  };
}

function calculatePercentage(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
