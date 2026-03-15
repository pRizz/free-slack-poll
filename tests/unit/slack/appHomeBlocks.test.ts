import { describe, expect, it } from "vitest";
import type { Button } from "@slack/types";

import { buildAppHomeBlocks } from "../../../src/slack/blocks/appHomeBlocks.js";

describe("buildAppHomeBlocks", () => {
  it("uses distinct action ids for the app home filter buttons", () => {
    // Arrange
    const blocks = buildAppHomeBlocks({
      filter: "open",
      manageablePolls: [],
      recentPolls: [],
    });
    const actionBlock = blocks[1];

    expect(actionBlock?.type).toBe("actions");

    const elements =
      actionBlock?.type === "actions"
        ? actionBlock.elements.filter(
            (element): element is Button => element.type === "button",
          )
        : [];

    // Act
    const filterActionIds = elements
      .filter((element) => {
        const buttonText = element.text?.text;

        return buttonText === "Open" || buttonText === "Closed";
      })
      .map((element) => element.action_id);

    // Assert
    expect(filterActionIds).toEqual([
      "poll_home_set_filter_open",
      "poll_home_set_filter_closed",
    ]);
    expect(new Set(filterActionIds).size).toBe(filterActionIds.length);
  });
});
