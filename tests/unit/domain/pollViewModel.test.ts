import { describe, expect, it } from "vitest";

import {
  buildPollDetailViewModel,
  buildPollMessageViewModel,
} from "../../../src/domain/polls/pollViewModel.js";
import { createPollSnapshot } from "../../helpers/pollFixtures.js";

describe("buildPollMessageViewModel", () => {
  it("shows live results when the poll is visible", () => {
    const snapshot = createPollSnapshot();

    const viewModel = buildPollMessageViewModel(snapshot);

    expect(viewModel.resultsVisible).toBe(true);
    expect(viewModel.optionItems[0]?.resultText).toContain("1 votes");
    expect(viewModel.resultsSummaryText).toBe("2 votes from 2 participants");
  });

  it("hides results until the poll closes", () => {
    const snapshot = createPollSnapshot({
      poll: {
        resultsVisibility: "hidden_until_closed",
      },
    });

    const viewModel = buildPollMessageViewModel(snapshot);

    expect(viewModel.resultsVisible).toBe(false);
    expect(viewModel.optionItems[0]?.resultText).toBeNull();
    expect(viewModel.resultsSummaryText).toContain(
      "hidden until the poll closes",
    );
  });
});

describe("buildPollDetailViewModel", () => {
  it("includes manager-facing metadata and voter mentions by option", () => {
    // Arrange
    const snapshot = createPollSnapshot();

    // Act
    const viewModel = buildPollDetailViewModel(snapshot);
    const createdAtTimestamp = Math.floor(
      snapshot.poll.createdAt.getTime() / 1000,
    );
    const closesAtTimestamp = Math.floor(
      (snapshot.poll.closesAt ?? new Date()).getTime() / 1000,
    );

    // Assert
    expect(viewModel.title).toBe("What should we ship next?");
    expect(viewModel.metadataLines).toEqual([
      "Created by <@U_CREATOR>",
      `Created <!date^${createdAtTimestamp}^{date_short_pretty} {time}|${snapshot.poll.createdAt.toISOString()}>`,
      "Posted in <#C123>",
      `Closes <!date^${closesAtTimestamp}^{date_short_pretty} {time}|${snapshot.poll.closesAt?.toISOString()}>`,
    ]);
    expect(viewModel.sections[0]).toEqual({
      heading: "Option A — 1 votes",
      lines: ["<@U_1>"],
    });
  });
});
