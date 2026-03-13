import type { CreatePollInput, PollResultsVisibility } from "../../domain/polls/types.js";
import type { PollModalMetadata } from "../metadata/pollModalMetadata.js";
import { slackBlockIds } from "../ids.js";
import type { SlackViewStateValues } from "../../types/slack.js";

export interface PollFormValues {
  allowOptionAdditions: boolean;
  allowVoteChanges: boolean;
  allowsMultipleChoices: boolean;
  closesAt: Date | null;
  description: string | null;
  isAnonymous: boolean;
  optionTexts: string[];
  question: string;
  resultsVisibility: PollResultsVisibility;
  targetConversationId: string | null;
}

export function extractPollFormValues(
  stateValues: SlackViewStateValues,
  metadata: PollModalMetadata,
): PollFormValues {
  const question = getPlainTextValue(stateValues, slackBlockIds.question, "value") ?? metadata.initialQuestion ?? "";
  const description =
    getPlainTextValue(stateValues, slackBlockIds.description, "value") ?? metadata.initialDescription;

  return {
    allowOptionAdditions: getCheckboxValue(
      stateValues,
      slackBlockIds.allowOptionAdditions,
      "value",
      "enabled",
    ),
    allowVoteChanges: getCheckboxValue(
      stateValues,
      slackBlockIds.allowVoteChanges,
      "value",
      "enabled",
    ),
    allowsMultipleChoices:
      getStaticSelectValue(stateValues, slackBlockIds.pollType, "value") === "multiple",
    closesAt: getDateTimeValue(stateValues, slackBlockIds.closeAt, "value"),
    description,
    isAnonymous: getCheckboxValue(stateValues, slackBlockIds.anonymous, "value", "enabled"),
    optionTexts: Array.from({ length: metadata.optionCount }, (_, index) => {
      return getPlainTextValue(stateValues, `${slackBlockIds.optionRow}_${index}`, "value") ?? "";
    }),
    question,
    resultsVisibility:
      getStaticSelectValue(stateValues, slackBlockIds.resultsVisibility, "value") === "hidden_until_closed"
        ? "hidden_until_closed"
        : "always_visible",
    targetConversationId:
      metadata.sourceConversationId ??
      getConversationValue(stateValues, slackBlockIds.targetConversation, "value"),
  };
}

export function parseCreatePollInput(
  stateValues: SlackViewStateValues,
  metadata: PollModalMetadata,
  creatorUserId: string,
): CreatePollInput {
  const values = extractPollFormValues(stateValues, metadata);

  return {
    allowOptionAdditions: values.allowOptionAdditions,
    allowsMultipleChoices: values.allowsMultipleChoices,
    allowVoteChanges: values.allowVoteChanges,
    closesAt: values.closesAt,
    creatorUserId,
    description: values.description,
    isAnonymous: values.isAnonymous,
    options: values.optionTexts,
    question: values.question,
    resultsVisibility: values.resultsVisibility,
    sourceConversationId: metadata.sourceConversationId,
    sourceMessageTs: metadata.sourceMessageTs,
    sourceType: metadata.sourceType,
    targetConversationId: values.targetConversationId,
    workspaceId: metadata.teamId,
  };
}

function getPlainTextValue(
  stateValues: SlackViewStateValues,
  blockId: string,
  actionId: string,
) {
  const maybeValue = stateValues[blockId]?.[actionId];

  return maybeValue?.type === "plain_text_input" ? maybeValue.value ?? null : null;
}

function getStaticSelectValue(
  stateValues: SlackViewStateValues,
  blockId: string,
  actionId: string,
) {
  const maybeValue = stateValues[blockId]?.[actionId];

  return maybeValue?.type === "static_select" ? maybeValue.selected_option?.value : undefined;
}

function getCheckboxValue(
  stateValues: SlackViewStateValues,
  blockId: string,
  actionId: string,
  selectedValue: string,
) {
  const maybeValue = stateValues[blockId]?.[actionId];

  return maybeValue?.type === "checkboxes"
    ? maybeValue.selected_options?.some((option) => option.value === selectedValue) ?? false
    : false;
}

function getConversationValue(
  stateValues: SlackViewStateValues,
  blockId: string,
  actionId: string,
) {
  const maybeValue = stateValues[blockId]?.[actionId];

  return maybeValue?.type === "conversations_select"
    ? maybeValue.selected_conversation ?? null
    : null;
}

function getDateTimeValue(stateValues: SlackViewStateValues, blockId: string, actionId: string) {
  const maybeValue = stateValues[blockId]?.[actionId];

  if (maybeValue?.type !== "datetimepicker" || maybeValue.selected_date_time === undefined) {
    return null;
  }

  return new Date(maybeValue.selected_date_time * 1000);
}
