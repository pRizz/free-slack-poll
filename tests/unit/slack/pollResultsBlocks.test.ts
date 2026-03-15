import { describe, expect, it } from "vitest";

import { buildPollDetailViewModel } from "../../../src/domain/polls/pollViewModel.js";
import { buildPollResultsBlocks } from "../../../src/slack/blocks/pollResultsBlocks.js";
import { createPollSnapshot } from "../../helpers/pollFixtures.js";

describe("buildPollResultsBlocks", () => {
  it("renders poll metadata before the voter breakdown", () => {
    // Arrange
    const viewModel = buildPollDetailViewModel(
      createPollSnapshot({
        poll: {
          channelId: "C_METADATA",
          closesAt: new Date("2026-03-14T15:00:00.000Z"),
          createdAt: new Date("2026-03-13T15:00:00.000Z"),
        },
      }),
    );

    // Act
    const blocks = buildPollResultsBlocks(viewModel);

    // Assert
    expect(blocks[1]).toMatchObject({
      type: "section",
    });
    expect(JSON.stringify(blocks[1])).toContain("Metadata");
    expect(JSON.stringify(blocks[1])).toContain("Created by <@U_CREATOR>");
    expect(JSON.stringify(blocks[1])).toContain("Posted in <#C_METADATA>");
    expect(JSON.stringify(blocks[2])).toContain("Option A");
  });
});
