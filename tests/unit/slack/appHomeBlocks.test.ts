import { describe, expect, it } from "vitest";
import type { Button } from "@slack/types";

import { buildPollSummaryViewModel } from "../../../src/domain/polls/pollViewModel.js";
import { buildAppHomeBlocks } from "../../../src/slack/blocks/appHomeBlocks.js";
import { createPollRecord } from "../../helpers/pollFixtures.js";

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

  it("renders creator and distinguishing metadata for open poll summaries", () => {
    // Arrange
    const createdAt = new Date("2026-03-13T15:00:00.000Z");
    const closesAt = new Date("2026-03-14T15:00:00.000Z");
    const summary = buildPollSummaryViewModel(
      createPollRecord({
        channelId: "C_METADATA",
        closesAt,
        createdAt,
      }),
    );
    const createdAtTimestamp = Math.floor(createdAt.getTime() / 1000);
    const closesAtTimestamp = Math.floor(closesAt.getTime() / 1000);

    // Act
    const blocks = buildAppHomeBlocks({
      filter: "open",
      manageablePolls: [summary],
      recentPolls: [],
    });
    const renderedBlocks = JSON.stringify(blocks);

    // Assert
    expect(renderedBlocks).toContain("Created by <@U_CREATOR>");
    expect(renderedBlocks).toContain(`Created <!date^${createdAtTimestamp}`);
    expect(renderedBlocks).toContain("Posted in <#C_METADATA>");
    expect(renderedBlocks).toContain(`Closes <!date^${closesAtTimestamp}`);
    expect(renderedBlocks).toContain("Status: open");
    expect(renderedBlocks).toContain("Open poll message");
  });

  it("renders closed timing and omits optional metadata when it is unavailable", () => {
    // Arrange
    const createdAt = new Date("2026-03-13T15:00:00.000Z");
    const closedAt = new Date("2026-03-15T09:30:00.000Z");
    const summary = buildPollSummaryViewModel(
      createPollRecord({
        channelId: null,
        closedAt,
        closesAt: null,
        createdAt,
        messagePermalink: null,
        status: "closed",
      }),
    );
    const closedAtTimestamp = Math.floor(closedAt.getTime() / 1000);

    // Act
    const blocks = buildAppHomeBlocks({
      filter: "closed",
      manageablePolls: [summary],
      recentPolls: [],
    });
    const renderedBlocks = JSON.stringify(blocks);

    // Assert
    expect(renderedBlocks).toContain(`Closed <!date^${closedAtTimestamp}`);
    expect(renderedBlocks).not.toContain("Closes <!date^");
    expect(renderedBlocks).not.toContain("Posted in <#");
    expect(renderedBlocks).not.toContain("Open poll message");
  });
});
