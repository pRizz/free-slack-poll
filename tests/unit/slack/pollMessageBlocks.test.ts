import { describe, expect, it } from "vitest";

import { buildPollMessageViewModel } from "../../../src/domain/polls/pollViewModel.js";
import { buildPollMessageBlocks } from "../../../src/slack/blocks/pollMessageBlocks.js";
import { createPollSnapshot } from "../../helpers/pollFixtures.js";

describe("buildPollMessageBlocks", () => {
  it("renders vote buttons and management actions", () => {
    const snapshot = createPollSnapshot();
    const viewModel = buildPollMessageViewModel(snapshot);

    const blocks = buildPollMessageBlocks(snapshot.poll.id, viewModel);
    const actionBlocks = blocks.filter((block) => block.type === "actions");

    expect(blocks[0]).toMatchObject({
      type: "section",
    });
    expect(actionBlocks).toHaveLength(1);
    expect(JSON.stringify(blocks)).toContain("\"action_id\":\"poll_vote\"");
    expect(JSON.stringify(blocks)).toContain("\"action_id\":\"poll_close\"");
  });
});
