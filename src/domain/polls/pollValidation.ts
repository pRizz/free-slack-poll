import { pollLimits } from "../../config/constants.js";
import type { Clock } from "../../lib/clock.js";
import { ValidationError } from "../../errors/domainErrors.js";
import type { CreatePollInput, ValidatedCreatePollInput } from "./types.js";

/**
 * Validates and normalizes user-provided poll creation input.
 */
export function validateCreatePollInput(
  input: CreatePollInput,
  clock: Clock,
): ValidatedCreatePollInput {
  const question = input.question.trim();
  const description = normalizeOptionalText(input.description);
  const options = normalizeOptions(input.options);
  const targetConversationId =
    normalizeOptionalText(input.targetConversationId) ??
    normalizeOptionalText(input.sourceConversationId);

  if (question.length === 0) {
    throw new ValidationError("A poll question is required.");
  }

  if (question.length > pollLimits.maxQuestionLength) {
    throw new ValidationError("The poll question is too long.", {
      maxQuestionLength: pollLimits.maxQuestionLength,
    });
  }

  if (description !== null && description.length > pollLimits.maxDescriptionLength) {
    throw new ValidationError("The poll description is too long.", {
      maxDescriptionLength: pollLimits.maxDescriptionLength,
    });
  }

  if (options.length < pollLimits.minOptionCount) {
    throw new ValidationError("A poll must include at least two answer options.", {
      minOptionCount: pollLimits.minOptionCount,
    });
  }

  if (options.length > pollLimits.maxOptionCount) {
    throw new ValidationError("This poll has too many answer options.", {
      maxOptionCount: pollLimits.maxOptionCount,
    });
  }

  if (targetConversationId === null) {
    throw new ValidationError("A target conversation is required before the poll can be posted.");
  }

  const duplicateKey = findDuplicateOptionKey(options);

  if (duplicateKey !== null) {
    throw new ValidationError("Poll options must be unique.", {
      duplicateOption: duplicateKey,
    });
  }

  if (input.closesAt !== null && input.closesAt !== undefined && input.closesAt <= clock.now()) {
    throw new ValidationError("The scheduled close time must be in the future.");
  }

  return {
    workspaceId: input.workspaceId,
    creatorUserId: input.creatorUserId,
    question,
    description,
    options,
    targetConversationId,
    sourceConversationId: normalizeOptionalText(input.sourceConversationId),
    sourceMessageTs: normalizeOptionalText(input.sourceMessageTs),
    sourceType: input.sourceType,
    isAnonymous: input.isAnonymous,
    allowsMultipleChoices: input.allowsMultipleChoices,
    allowVoteChanges: input.allowVoteChanges,
    allowOptionAdditions: input.allowOptionAdditions,
    resultsVisibility: input.resultsVisibility,
    closesAt: input.closesAt ?? null,
  };
}

function normalizeOptions(options: string[]) {
  return options
    .map((option) => option.trim())
    .filter((option) => option.length > 0)
    .map((option) => {
      if (option.length > pollLimits.maxOptionLength) {
        throw new ValidationError("An answer option is too long.", {
          maxOptionLength: pollLimits.maxOptionLength,
        });
      }

      return option;
    });
}

function findDuplicateOptionKey(options: string[]) {
  const seenKeys = new Set<string>();

  for (const option of options) {
    const optionKey = option.toLocaleLowerCase();

    if (seenKeys.has(optionKey)) {
      return option;
    }

    seenKeys.add(optionKey);
  }

  return null;
}

function normalizeOptionalText(maybeValue?: string | null) {
  if (maybeValue === null || maybeValue === undefined) {
    return null;
  }

  const value = maybeValue.trim();

  return value.length > 0 ? value : null;
}
