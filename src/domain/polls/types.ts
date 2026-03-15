export type PollStatus = "draft" | "open" | "closed";
export type PollResultsVisibility = "always_visible" | "hidden_until_closed";
export type PollCloseReason = "manual" | "scheduled" | "system";
export type PollSourceType =
  | "slash_command"
  | "global_shortcut"
  | "message_shortcut"
  | "app_home";

export interface PollRecord {
  id: string;
  workspaceId: string;
  channelId: string | null;
  messageTs: string | null;
  messagePermalink: string | null;
  creatorUserId: string;
  question: string;
  description: string | null;
  status: PollStatus;
  isAnonymous: boolean;
  allowsMultipleChoices: boolean;
  allowVoteChanges: boolean;
  allowOptionAdditions: boolean;
  resultsVisibility: PollResultsVisibility;
  closesAt: Date | null;
  closedAt: Date | null;
  closedByUserId: string | null;
  closeReason: PollCloseReason | null;
  sourceType: PollSourceType;
  sourceChannelId: string | null;
  sourceMessageTs: string | null;
  needsSlackSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOptionRecord {
  id: string;
  pollId: string;
  position: number;
  text: string;
  createdByUserId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface VoteRecord {
  id: string;
  pollId: string;
  pollOptionId: string;
  voterUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollSnapshot {
  poll: PollRecord;
  options: PollOptionRecord[];
  votes: VoteRecord[];
}

export interface CreatePollInput {
  workspaceId: string;
  creatorUserId: string;
  question: string;
  description?: string | null;
  options: string[];
  targetConversationId?: string | null;
  sourceConversationId?: string | null;
  sourceMessageTs?: string | null;
  sourceType: PollSourceType;
  isAnonymous: boolean;
  allowsMultipleChoices: boolean;
  allowVoteChanges: boolean;
  allowOptionAdditions: boolean;
  resultsVisibility: PollResultsVisibility;
  closesAt?: Date | null;
}

export interface ValidatedCreatePollInput {
  workspaceId: string;
  creatorUserId: string;
  question: string;
  description: string | null;
  options: string[];
  targetConversationId: string;
  sourceConversationId: string | null;
  sourceMessageTs: string | null;
  sourceType: PollSourceType;
  isAnonymous: boolean;
  allowsMultipleChoices: boolean;
  allowVoteChanges: boolean;
  allowOptionAdditions: boolean;
  resultsVisibility: PollResultsVisibility;
  closesAt: Date | null;
}

export interface PollOptionResult {
  optionId: string;
  label: string;
  voteCount: number;
  votePercentage: number;
  voterIds: string[];
}

export interface AggregatedPollResults {
  optionResults: PollOptionResult[];
  totalVoteCount: number;
  uniqueVoterCount: number;
}

export interface PollMessageViewModel {
  optionItems: Array<{
    buttonText: string;
    optionId: string;
    resultText: string | null;
  }>;
  metadataLines: string[];
  managementActions: Array<{
    key: "close_poll" | "view_details";
    style?: "danger" | "primary";
    text: string;
    value: string;
  }>;
  question: string;
  description: string | null;
  statusText: string;
  resultsSummaryText: string;
  resultsVisible: boolean;
}

export interface PollSummaryViewModel {
  messagePermalink: string | null;
  metadataLines: string[];
  question: string;
  statusText: string;
}

export interface PollDetailViewModel {
  metadataLines: string[];
  title: string;
  sections: Array<{
    heading: string;
    lines: string[];
  }>;
}
