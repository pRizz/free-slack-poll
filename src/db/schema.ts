import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const slackPollSchema = pgSchema("slack_poll");

export const pollStatusEnum = slackPollSchema.enum("poll_status", ["draft", "open", "closed"]);
export const pollResultsVisibilityEnum = slackPollSchema.enum("poll_results_visibility", [
  "always_visible",
  "hidden_until_closed",
]);
export const pollCloseReasonEnum = slackPollSchema.enum("poll_close_reason", [
  "manual",
  "scheduled",
  "system",
]);
export const pollSourceTypeEnum = slackPollSchema.enum("poll_source_type", [
  "slash_command",
  "global_shortcut",
  "message_shortcut",
  "app_home",
]);

export const workspaces = slackPollSchema.table("workspaces", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().unique(),
  teamDomain: text("team_domain"),
  teamName: text("team_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const polls = slackPollSchema.table(
  "polls",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelId: text("channel_id"),
    messageTs: text("message_ts"),
    messagePermalink: text("message_permalink"),
    creatorUserId: text("creator_user_id").notNull(),
    question: text("question").notNull(),
    description: text("description"),
    status: pollStatusEnum("status").notNull().default("draft"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    allowsMultipleChoices: boolean("allows_multiple_choices").notNull().default(false),
    allowVoteChanges: boolean("allow_vote_changes").notNull().default(true),
    allowOptionAdditions: boolean("allow_option_additions").notNull().default(false),
    resultsVisibility: pollResultsVisibilityEnum("results_visibility")
      .notNull()
      .default("always_visible"),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedByUserId: text("closed_by_user_id"),
    closeReason: pollCloseReasonEnum("close_reason"),
    sourceType: pollSourceTypeEnum("source_type").notNull(),
    sourceChannelId: text("source_channel_id"),
    sourceMessageTs: text("source_message_ts"),
    needsSlackSync: boolean("needs_slack_sync").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("polls_workspace_status_closes_idx").on(table.workspaceId, table.status, table.closesAt),
    index("polls_workspace_creator_created_idx").on(
      table.workspaceId,
      table.creatorUserId,
      table.createdAt,
    ),
    uniqueIndex("polls_channel_message_unique_idx").on(table.channelId, table.messageTs),
  ],
);

export const pollOptions = slackPollSchema.table(
  "poll_options",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("poll_options_poll_position_unique_idx").on(table.pollId, table.position),
  ],
);

export const votes = slackPollSchema.table(
  "votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    pollOptionId: text("poll_option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    voterUserId: text("voter_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("votes_poll_option_voter_unique_idx").on(
      table.pollId,
      table.pollOptionId,
      table.voterUserId,
    ),
    index("votes_poll_voter_idx").on(table.pollId, table.voterUserId),
    index("votes_poll_option_idx").on(table.pollId, table.pollOptionId),
  ],
);

export const pollEvents = slackPollSchema.table(
  "poll_events",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("poll_events_poll_created_idx").on(table.pollId, table.createdAt)],
);

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  polls: many(polls),
}));

export const pollRelations = relations(polls, ({ many, one }) => ({
  options: many(pollOptions),
  votes: many(votes),
  workspace: one(workspaces, {
    fields: [polls.workspaceId],
    references: [workspaces.id],
  }),
  events: many(pollEvents),
}));

export const pollOptionRelations = relations(pollOptions, ({ many, one }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(votes),
}));

export const voteRelations = relations(votes, ({ one }) => ({
  option: one(pollOptions, {
    fields: [votes.pollOptionId],
    references: [pollOptions.id],
  }),
  poll: one(polls, {
    fields: [votes.pollId],
    references: [polls.id],
  }),
}));

export const pollEventRelations = relations(pollEvents, ({ one }) => ({
  poll: one(polls, {
    fields: [pollEvents.pollId],
    references: [polls.id],
  }),
}));
