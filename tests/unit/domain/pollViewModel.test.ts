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
    expect(viewModel.resultsSummaryText).toContain("hidden until the poll closes");
  });
});

describe("buildPollDetailViewModel", () => {
  it("lists voter mentions by option", () => {
    const snapshot = createPollSnapshot();

    const viewModel = buildPollDetailViewModel(snapshot);

    expect(viewModel.title).toBe("What should we ship next?");
    expect(viewModel.sections[0]).toEqual({
      heading: "Option A — 1 votes",
      lines: ["<@U_1>"],
    });
  });
});
