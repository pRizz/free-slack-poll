import type { PollSourceType } from "../../domain/polls/types.js";

export interface PollModalMetadata {
  initialDescription: string | null;
  initialQuestion: string | null;
  optionCount: number;
  sourceConversationId: string | null;
  sourceMessageTs: string | null;
  sourceType: PollSourceType;
  teamId: string;
}

export function encodePollModalMetadata(metadata: PollModalMetadata) {
  return JSON.stringify(metadata);
}

export function decodePollModalMetadata(
  maybeValue: string | undefined,
): PollModalMetadata {
  if (!maybeValue) {
    throw new Error("Poll modal metadata is missing.");
  }

  const parsedValue = JSON.parse(maybeValue) as Partial<PollModalMetadata>;

  if (
    typeof parsedValue.optionCount !== "number" ||
    typeof parsedValue.sourceType !== "string" ||
    typeof parsedValue.teamId !== "string"
  ) {
    throw new Error("Poll modal metadata is invalid.");
  }

  return {
    initialDescription:
      typeof parsedValue.initialDescription === "string"
        ? parsedValue.initialDescription
        : null,
    initialQuestion:
      typeof parsedValue.initialQuestion === "string"
        ? parsedValue.initialQuestion
        : null,
    optionCount: parsedValue.optionCount,
    sourceConversationId:
      typeof parsedValue.sourceConversationId === "string"
        ? parsedValue.sourceConversationId
        : null,
    sourceMessageTs:
      typeof parsedValue.sourceMessageTs === "string"
        ? parsedValue.sourceMessageTs
        : null,
    sourceType: parsedValue.sourceType as PollSourceType,
    teamId: parsedValue.teamId,
  };
}
