CREATE SCHEMA IF NOT EXISTS slack_poll;

CREATE TYPE slack_poll.poll_status AS ENUM ('draft', 'open', 'closed');
CREATE TYPE slack_poll.poll_results_visibility AS ENUM ('always_visible', 'hidden_until_closed');
CREATE TYPE slack_poll.poll_close_reason AS ENUM ('manual', 'scheduled', 'system');
CREATE TYPE slack_poll.poll_source_type AS ENUM ('slash_command', 'global_shortcut', 'message_shortcut', 'app_home');

CREATE TABLE IF NOT EXISTS slack_poll.schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slack_poll.workspaces (
  id text PRIMARY KEY,
  team_id text NOT NULL UNIQUE,
  team_domain text,
  team_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slack_poll.polls (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES slack_poll.workspaces(id) ON DELETE CASCADE,
  channel_id text,
  message_ts text,
  message_permalink text,
  creator_user_id text NOT NULL,
  question text NOT NULL,
  description text,
  status slack_poll.poll_status NOT NULL DEFAULT 'draft',
  is_anonymous boolean NOT NULL DEFAULT false,
  allows_multiple_choices boolean NOT NULL DEFAULT false,
  allow_vote_changes boolean NOT NULL DEFAULT true,
  allow_option_additions boolean NOT NULL DEFAULT false,
  results_visibility slack_poll.poll_results_visibility NOT NULL DEFAULT 'always_visible',
  closes_at timestamptz,
  closed_at timestamptz,
  closed_by_user_id text,
  close_reason slack_poll.poll_close_reason,
  source_type slack_poll.poll_source_type NOT NULL,
  source_channel_id text,
  source_message_ts text,
  needs_slack_sync boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS polls_channel_message_unique_idx
  ON slack_poll.polls (channel_id, message_ts);

CREATE INDEX IF NOT EXISTS polls_workspace_status_closes_idx
  ON slack_poll.polls (workspace_id, status, closes_at);

CREATE INDEX IF NOT EXISTS polls_workspace_creator_created_idx
  ON slack_poll.polls (workspace_id, creator_user_id, created_at);

CREATE TABLE IF NOT EXISTS slack_poll.poll_options (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES slack_poll.polls(id) ON DELETE CASCADE,
  position integer NOT NULL,
  text text NOT NULL,
  created_by_user_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS poll_options_poll_position_unique_idx
  ON slack_poll.poll_options (poll_id, position);

CREATE TABLE IF NOT EXISTS slack_poll.votes (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES slack_poll.polls(id) ON DELETE CASCADE,
  poll_option_id text NOT NULL REFERENCES slack_poll.poll_options(id) ON DELETE CASCADE,
  voter_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS votes_poll_option_voter_unique_idx
  ON slack_poll.votes (poll_id, poll_option_id, voter_user_id);

CREATE INDEX IF NOT EXISTS votes_poll_voter_idx
  ON slack_poll.votes (poll_id, voter_user_id);

CREATE INDEX IF NOT EXISTS votes_poll_option_idx
  ON slack_poll.votes (poll_id, poll_option_id);

CREATE TABLE IF NOT EXISTS slack_poll.poll_events (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES slack_poll.polls(id) ON DELETE CASCADE,
  actor_user_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poll_events_poll_created_idx
  ON slack_poll.poll_events (poll_id, created_at);
