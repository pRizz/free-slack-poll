import { describe, expect, it } from "vitest";

import { aggregatePollResults } from "../../../src/domain/polls/pollResults.js";
import { createPollOptions, createVotes } from "../../helpers/pollFixtures.js";

describe("aggregatePollResults", () => {
  it("computes counts, percentages, and unique voters", () => {
    const options = createPollOptions();
    const votes = createVotes([
      {},
      {},
      {
        id: "vote_3",
        pollOptionId: "opt_1",
        voterUserId: "U_3",
      },
    ]);

    const result = aggregatePollResults(options, votes);

    expect(result.totalVoteCount).toBe(3);
    expect(result.uniqueVoterCount).toBe(3);
    expect(result.optionResults).toEqual([
      {
        label: "Option A",
        optionId: "opt_1",
        voteCount: 2,
        votePercentage: 67,
        voterIds: ["U_1", "U_3"],
      },
      {
        label: "Option B",
        optionId: "opt_2",
        voteCount: 1,
        votePercentage: 33,
        voterIds: ["U_2"],
      },
    ]);
  });
});
