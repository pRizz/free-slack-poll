import { describe, expect, it } from "vitest";

import { extractPollFormValues } from "../../../src/slack/views/pollSubmissionParser.js";
import type { PollModalMetadata } from "../../../src/slack/metadata/pollModalMetadata.js";
import type { SlackViewStateValues } from "../../../src/types/slack.js";

const baseMetadata: PollModalMetadata = {
  initialDescription: null,
  initialQuestion: null,
  optionCount: 2,
  sourceConversationId: null,
  sourceMessageTs: null,
  sourceType: "slash_command",
  teamId: "T_1",
};

describe("extractPollFormValues", () => {
  it("treats a blank optional close time as null", () => {
    // Arrange
    const stateValues: SlackViewStateValues = {
      close_at: {
        value: {
          type: "datetimepicker",
          selected_date_time: 0,
        },
      },
      option_row_0: {
        value: {
          type: "plain_text_input",
          value: "Alpha",
        },
      },
      option_row_1: {
        value: {
          type: "plain_text_input",
          value: "Beta",
        },
      },
      poll_type: {
        value: {
          type: "static_select",
          selected_option: {
            value: "single",
          },
        },
      },
      question: {
        value: {
          type: "plain_text_input",
          value: "Question",
        },
      },
      results_visibility: {
        value: {
          type: "static_select",
          selected_option: {
            value: "always_visible",
          },
        },
      },
      target_conversation: {
        value: {
          type: "conversations_select",
          selected_conversation: "C_1",
        },
      },
    };

    // Act
    const result = extractPollFormValues(stateValues, baseMetadata);

    // Assert
    expect(result.closesAt).toBeNull();
  });

  it("parses a selected close time into a date", () => {
    // Arrange
    const stateValues: SlackViewStateValues = {
      close_at: {
        value: {
          type: "datetimepicker",
          selected_date_time: "1893456000",
        },
      },
      option_row_0: {
        value: {
          type: "plain_text_input",
          value: "Alpha",
        },
      },
      option_row_1: {
        value: {
          type: "plain_text_input",
          value: "Beta",
        },
      },
      poll_type: {
        value: {
          type: "static_select",
          selected_option: {
            value: "single",
          },
        },
      },
      question: {
        value: {
          type: "plain_text_input",
          value: "Question",
        },
      },
      results_visibility: {
        value: {
          type: "static_select",
          selected_option: {
            value: "always_visible",
          },
        },
      },
      target_conversation: {
        value: {
          type: "conversations_select",
          selected_conversation: "C_1",
        },
      },
    };

    // Act
    const result = extractPollFormValues(stateValues, baseMetadata);

    // Assert
    expect(result.closesAt?.toISOString()).toBe("2030-01-01T00:00:00.000Z");
  });
});
