import type { PollRecord } from "../polls/types.js";

export type VoteMutationCode =
  | "duplicate_vote"
  | "invalid_option"
  | "poll_closed"
  | "vote_changes_disabled";

export type VoteMutationResult =
  | {
      kind: "error";
      code: VoteMutationCode;
      message: string;
    }
  | {
      kind: "success";
      addedOptionIds: string[];
      removedOptionIds: string[];
      message: string;
    };

export interface ApplyVoteRulesInput {
  currentOptionIds: string[];
  optionId: string;
  poll: Pick<PollRecord, "allowVoteChanges" | "allowsMultipleChoices" | "status">;
  validOptionIds: readonly string[];
}

/**
 * Computes the mutation plan for a vote action.
 */
export function applyVoteRules(input: ApplyVoteRulesInput): VoteMutationResult {
  if (input.poll.status !== "open") {
    return {
      kind: "error",
      code: "poll_closed",
      message: "This poll is already closed.",
    };
  }

  if (!input.validOptionIds.includes(input.optionId)) {
    return {
      kind: "error",
      code: "invalid_option",
      message: "That poll option no longer exists.",
    };
  }

  const uniqueCurrentOptionIds = new Set(input.currentOptionIds);
  const alreadySelected = uniqueCurrentOptionIds.has(input.optionId);

  if (input.poll.allowsMultipleChoices) {
    if (!alreadySelected) {
      return {
        kind: "success",
        addedOptionIds: [input.optionId],
        removedOptionIds: [],
        message: "Your vote was recorded.",
      };
    }

    if (!input.poll.allowVoteChanges) {
      return {
        kind: "error",
        code: "vote_changes_disabled",
        message: "Vote changes are disabled for this poll.",
      };
    }

    return {
      kind: "success",
      addedOptionIds: [],
      removedOptionIds: [input.optionId],
      message: "Your vote was removed.",
    };
  }

  const currentSelection = Array.from(uniqueCurrentOptionIds)[0];

  if (currentSelection === input.optionId) {
    return {
      kind: "error",
      code: "duplicate_vote",
      message: "You have already voted for that option.",
    };
  }

  if (currentSelection === undefined) {
    return {
      kind: "success",
      addedOptionIds: [input.optionId],
      removedOptionIds: [],
      message: "Your vote was recorded.",
    };
  }

  if (!input.poll.allowVoteChanges) {
    return {
      kind: "error",
      code: "vote_changes_disabled",
      message: "Vote changes are disabled for this poll.",
    };
  }

  return {
    kind: "success",
    addedOptionIds: [input.optionId],
    removedOptionIds: [currentSelection],
    message: "Your vote was updated.",
  };
}
