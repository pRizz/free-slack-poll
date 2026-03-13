import { describe, expect, it } from "vitest";

import { applyVoteRules } from "../../../src/domain/votes/voteRules.js";

describe("applyVoteRules", () => {
  it("records a first single-choice vote", () => {
    const result = applyVoteRules({
      currentOptionIds: [],
      optionId: "opt_1",
      poll: {
        allowVoteChanges: true,
        allowsMultipleChoices: false,
        status: "open",
      },
      validOptionIds: ["opt_1", "opt_2"],
    });

    expect(result).toEqual({
      kind: "success",
      addedOptionIds: ["opt_1"],
      removedOptionIds: [],
      message: "Your vote was recorded.",
    });
  });

  it("rejects a second single-choice vote when vote changes are disabled", () => {
    const result = applyVoteRules({
      currentOptionIds: ["opt_1"],
      optionId: "opt_2",
      poll: {
        allowVoteChanges: false,
        allowsMultipleChoices: false,
        status: "open",
      },
      validOptionIds: ["opt_1", "opt_2"],
    });

    expect(result).toEqual({
      kind: "error",
      code: "vote_changes_disabled",
      message: "Vote changes are disabled for this poll.",
    });
  });

  it("replaces a prior single-choice vote when vote changes are enabled", () => {
    const result = applyVoteRules({
      currentOptionIds: ["opt_1"],
      optionId: "opt_2",
      poll: {
        allowVoteChanges: true,
        allowsMultipleChoices: false,
        status: "open",
      },
      validOptionIds: ["opt_1", "opt_2"],
    });

    expect(result).toEqual({
      kind: "success",
      addedOptionIds: ["opt_2"],
      removedOptionIds: ["opt_1"],
      message: "Your vote was updated.",
    });
  });

  it("toggles a multi-select vote off when vote changes are enabled", () => {
    const result = applyVoteRules({
      currentOptionIds: ["opt_1", "opt_2"],
      optionId: "opt_2",
      poll: {
        allowVoteChanges: true,
        allowsMultipleChoices: true,
        status: "open",
      },
      validOptionIds: ["opt_1", "opt_2"],
    });

    expect(result).toEqual({
      kind: "success",
      addedOptionIds: [],
      removedOptionIds: ["opt_2"],
      message: "Your vote was removed.",
    });
  });
});
