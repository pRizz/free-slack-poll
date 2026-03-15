import type { View } from "@slack/types";

import { pollLimits } from "../../config/constants.js";
import type { PollModalMetadata } from "../metadata/pollModalMetadata.js";
import { encodePollModalMetadata } from "../metadata/pollModalMetadata.js";
import { slackActionIds, slackBlockIds, slackViewIds } from "../ids.js";
import type { PollFormValues } from "./pollSubmissionParser.js";

export function buildPollCreateView(
  metadata: PollModalMetadata,
  values: Partial<PollFormValues> = {},
): View {
  const showTargetConversationPicker = metadata.sourceConversationId === null;
  const optionTexts = Array.from(
    { length: metadata.optionCount },
    (_, index) => {
      return values.optionTexts?.[index] ?? "";
    },
  );

  const blocks: View["blocks"] = [
    {
      type: "input",
      block_id: slackBlockIds.question,
      label: {
        type: "plain_text",
        text: "Question",
        emoji: true,
      },
      element: createPlainTextInputElement({
        initialValue: values.question ?? metadata.initialQuestion ?? null,
        maxLength: pollLimits.maxQuestionLength,
        placeholder: "What should the team vote on?",
      }),
    },
    {
      type: "input",
      optional: true,
      block_id: slackBlockIds.description,
      label: {
        type: "plain_text",
        text: "Description",
        emoji: true,
      },
      element: createPlainTextInputElement({
        initialValue: values.description ?? metadata.initialDescription ?? null,
        isMultiline: true,
        maxLength: pollLimits.maxDescriptionLength,
      }),
    },
  ];

  if (showTargetConversationPicker) {
    blocks.push({
      type: "input",
      block_id: slackBlockIds.targetConversation,
      label: {
        type: "plain_text",
        text: "Post in conversation",
        emoji: true,
      },
      element: createConversationSelectElement(
        values.targetConversationId ?? null,
      ),
    });
  }

  blocks.push({
    type: "input",
    block_id: slackBlockIds.pollType,
    label: {
      type: "plain_text",
      text: "Poll type",
      emoji: true,
    },
    element: {
      type: "static_select",
      action_id: "value",
      initial_option:
        (values.allowsMultipleChoices ?? false)
          ? option("Multiple choice", "multiple")
          : option("Single choice", "single"),
      options: [
        option("Single choice", "single"),
        option("Multiple choice", "multiple"),
      ],
    },
  });

  blocks.push(
    createSingleCheckboxInput(
      slackBlockIds.anonymous,
      "Anonymous poll",
      "Hide voter identities from results views.",
      values.isAnonymous ?? false,
    ),
    createSingleCheckboxInput(
      slackBlockIds.allowVoteChanges,
      "Allow vote changes",
      "Users can update or remove an existing vote.",
      values.allowVoteChanges ?? true,
    ),
    createSingleCheckboxInput(
      slackBlockIds.allowOptionAdditions,
      "Allow option additions",
      "Moderators can add more options after posting.",
      values.allowOptionAdditions ?? false,
    ),
    {
      type: "input",
      block_id: slackBlockIds.resultsVisibility,
      label: {
        type: "plain_text",
        text: "Results visibility",
        emoji: true,
      },
      element: {
        type: "static_select",
        action_id: "value",
        initial_option:
          values.resultsVisibility === "hidden_until_closed"
            ? option("Hide until poll closes", "hidden_until_closed")
            : option("Show live results", "always_visible"),
        options: [
          option("Show live results", "always_visible"),
          option("Hide until poll closes", "hidden_until_closed"),
        ],
      },
    },
    {
      type: "input",
      optional: true,
      block_id: slackBlockIds.closeAt,
      label: {
        type: "plain_text",
        text: "Close automatically",
        emoji: true,
      },
      element: {
        type: "datetimepicker",
        action_id: "value",
        ...(values.closesAt !== null && values.closesAt !== undefined
          ? { initial_date_time: Math.floor(values.closesAt.getTime() / 1000) }
          : {}),
      },
    },
  );

  optionTexts.forEach((optionText, index) => {
    blocks.push({
      type: "input",
      block_id: `${slackBlockIds.optionRow}_${index}`,
      label: {
        type: "plain_text",
        text: `Option ${index + 1}`,
        emoji: true,
      },
      element: createPlainTextInputElement({
        initialValue: optionText || null,
        maxLength: pollLimits.maxOptionLength,
      }),
    });
  });

  const optionRowActionElements = [];

  if (metadata.optionCount < pollLimits.maxOptionCount) {
    optionRowActionElements.push({
      type: "button" as const,
      action_id: slackActionIds.addOptionRow,
      text: {
        type: "plain_text" as const,
        text: "Add option",
        emoji: true,
      },
      value: "add",
    });
  }

  if (metadata.optionCount > pollLimits.minOptionCount) {
    optionRowActionElements.push({
      type: "button" as const,
      action_id: slackActionIds.removeOptionRow,
      text: {
        type: "plain_text" as const,
        text: "Remove option",
        emoji: true,
      },
      value: "remove",
      style: "danger" as const,
    });
  }

  blocks.push({
    type: "actions",
    elements: optionRowActionElements,
  });

  return {
    type: "modal",
    callback_id: slackViewIds.createPoll,
    private_metadata: encodePollModalMetadata(metadata),
    submit: {
      type: "plain_text",
      text: "Post poll",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    title: {
      type: "plain_text",
      text: "Create poll",
      emoji: true,
    },
    blocks,
  };
}

function createSingleCheckboxInput(
  blockId: string,
  label: string,
  optionLabel: string,
  isChecked: boolean,
) {
  const checkboxOption = option(optionLabel, "enabled");

  return {
    type: "input" as const,
    optional: true,
    block_id: blockId,
    label: {
      type: "plain_text" as const,
      text: label,
      emoji: true,
    },
    element: {
      type: "checkboxes" as const,
      action_id: "value",
      options: [checkboxOption],
      initial_options: isChecked ? [checkboxOption] : [],
    },
  };
}

function option(text: string, value: string) {
  return {
    text: {
      type: "plain_text" as const,
      text,
      emoji: true,
    },
    value,
  };
}

function createConversationSelectElement(initialConversationId: string | null) {
  const includedConversationTypes: Array<"public" | "private" | "im" | "mpim"> =
    ["public", "private", "im", "mpim"];

  return {
    type: "conversations_select" as const,
    action_id: "value",
    filter: {
      include: includedConversationTypes,
    },
    ...(initialConversationId !== null
      ? { initial_conversation: initialConversationId }
      : {}),
  };
}

function createPlainTextInputElement(input: {
  initialValue?: string | null;
  isMultiline?: boolean;
  maxLength: number;
  placeholder?: string;
}) {
  return {
    type: "plain_text_input" as const,
    action_id: "value",
    max_length: input.maxLength,
    ...(input.initialValue !== null && input.initialValue !== undefined
      ? { initial_value: input.initialValue }
      : {}),
    ...(input.isMultiline ? { multiline: true } : {}),
    ...(input.placeholder
      ? {
          placeholder: {
            type: "plain_text" as const,
            text: input.placeholder,
            emoji: true,
          },
        }
      : {}),
  };
}
