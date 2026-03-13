import { validateCreatePollInput } from "../domain/polls/pollValidation.js";
import type { Clock } from "../lib/clock.js";
import { ValidationError } from "../errors/domainErrors.js";
import type { PollCreationDependencies, PollCreationRequest } from "./ports.js";

export interface CreatedPollResult {
  pollId: string;
  targetConversationId: string;
}

export class PollCreationService {
  constructor(
    private readonly dependencies: PollCreationDependencies,
    private readonly clock: Clock,
  ) {}

  async createPoll(request: PollCreationRequest): Promise<CreatedPollResult> {
    const validatedInput = validateCreatePollInput(request, this.clock);

    if (validatedInput.workspaceId !== request.teamId) {
      throw new ValidationError("Workspace and team identifiers must match.");
    }

    await this.dependencies.workspaceStore.upsertWorkspace({
      ...(request.teamDomain !== undefined ? { teamDomain: request.teamDomain } : {}),
      teamId: request.teamId,
      ...(request.teamName !== undefined ? { teamName: request.teamName } : {}),
    });

    const pollId = this.dependencies.idGenerator.next();

    await this.dependencies.pollStore.createPollWithOptions({
      options: validatedInput.options.map((optionText, index) => ({
        createdByUserId: validatedInput.creatorUserId,
        id: this.dependencies.idGenerator.next(),
        pollId,
        position: index,
        text: optionText,
      })),
      poll: {
        allowOptionAdditions: validatedInput.allowOptionAdditions,
        allowsMultipleChoices: validatedInput.allowsMultipleChoices,
        allowVoteChanges: validatedInput.allowVoteChanges,
        channelId: validatedInput.targetConversationId,
        closesAt: validatedInput.closesAt,
        creatorUserId: validatedInput.creatorUserId,
        description: validatedInput.description,
        id: pollId,
        isAnonymous: validatedInput.isAnonymous,
        question: validatedInput.question,
        resultsVisibility: validatedInput.resultsVisibility,
        sourceChannelId: validatedInput.sourceConversationId,
        sourceMessageTs: validatedInput.sourceMessageTs,
        sourceType: validatedInput.sourceType,
        status: "open",
        workspaceId: validatedInput.workspaceId,
      },
    });

    await this.dependencies.pollEventStore.append({
      actorUserId: validatedInput.creatorUserId,
      eventType: "poll_created",
      payload: {
        optionCount: validatedInput.options.length,
        sourceType: validatedInput.sourceType,
      },
      pollId,
    });

    return {
      pollId,
      targetConversationId: validatedInput.targetConversationId,
    };
  }
}
