export const slackCommandIds = {
  poll: "/poll",
} as const;

export const slackShortcutIds = {
  createFromMessage: "create_poll_from_message",
  createGlobal: "create_poll_global",
} as const;

export const slackViewIds = {
  createPoll: "poll_create_view",
} as const;

export const slackActionIds = {
  addOptionRow: "poll_add_option_row",
  closePoll: "poll_close",
  filterManageablePolls: "poll_home_filter_manageable",
  filterRecentPolls: "poll_home_filter_recent",
  removeOptionRow: "poll_remove_option_row",
  viewPollDetails: "poll_view_details",
  vote: "poll_vote",
} as const;

export const slackBlockIds = {
  allowOptionAdditions: "allow_option_additions",
  allowVoteChanges: "allow_vote_changes",
  anonymous: "anonymous",
  closeAt: "close_at",
  description: "description",
  optionRow: "option_row",
  pollType: "poll_type",
  question: "question",
  resultsVisibility: "results_visibility",
  targetConversation: "target_conversation",
} as const;
