import { describe, expect, it } from "vitest";

import { validateCreatePollInput } from "../../../src/domain/polls/pollValidation.js";
import { systemClock } from "../../../src/lib/clock.js";

describe("validateCreatePollInput", () => {
  it("normalizes a valid poll request", () => {
    const result = validateCreatePollInput(
      {
        workspaceId: "workspace_1",
        creatorUserId: "U_1",
        question: "  What should we launch? ",
        description: "  Vote for the next release. ",
        options: ["  Alpha ", "Beta", " "],
        sourceType: "slash_command",
        targetConversationId: "C123",
        isAnonymous: false,
        allowsMultipleChoices: false,
        allowVoteChanges: true,
        allowOptionAdditions: false,
        resultsVisibility: "always_visible",
        closesAt: new Date("2026-03-14T12:00:00.000Z"),
      },
      systemClock,
    );

    expect(result.question).toBe("What should we launch?");
    expect(result.description).toBe("Vote for the next release.");
    expect(result.options).toEqual(["Alpha", "Beta"]);
    expect(result.targetConversationId).toBe("C123");
  });

  it("rejects duplicate options after normalization", () => {
    expect(() =>
      validateCreatePollInput(
        {
          workspaceId: "workspace_1",
          creatorUserId: "U_1",
          question: "Question",
          options: ["Alpha", " alpha "],
          sourceType: "slash_command",
          targetConversationId: "C123",
          isAnonymous: false,
          allowsMultipleChoices: false,
          allowVoteChanges: true,
          allowOptionAdditions: false,
          resultsVisibility: "always_visible",
        },
        systemClock,
      ),
    ).toThrowError(/unique/i);
  });

  it("rejects past close times", () => {
    expect(() =>
      validateCreatePollInput(
        {
          workspaceId: "workspace_1",
          creatorUserId: "U_1",
          question: "Question",
          options: ["Alpha", "Beta"],
          sourceType: "slash_command",
          targetConversationId: "C123",
          isAnonymous: false,
          allowsMultipleChoices: false,
          allowVoteChanges: true,
          allowOptionAdditions: false,
          resultsVisibility: "always_visible",
          closesAt: new Date("2020-01-01T00:00:00.000Z"),
        },
        systemClock,
      ),
    ).toThrowError(/future/i);
  });
});
