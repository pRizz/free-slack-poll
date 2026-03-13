# free-slack-poll

Production-quality Slack polling app built with TypeScript, Bun, Node.js, Slack Bolt, and PostgreSQL.

This project targets **private/internal Slack app distribution first**. It uses **Socket Mode** by default for easier local development and single-worker internal deployment, while keeping the codebase structured for future hardening or broader distribution.

## Features

- Slash command entry point: `/poll`
- Global shortcut: **New poll**
- Message shortcut: **Create poll**
- Modal-based poll creation
- Single-choice and multiple-choice polls
- Anonymous and non-anonymous polls
- Hidden results until close
- Manual close and scheduled auto-close
- Live message updates after votes
- App Home surface for recent and manageable polls
- Durable PostgreSQL persistence with explicit SQL migrations
- Functional core / imperative shell architecture for strong unit-test coverage

## Product scope

Implemented for v1:

- private/internal Slack app distribution
- Socket Mode runtime
- configured app admins via `POLL_ADMIN_USER_IDS`
- single-worker scheduling model
- support for public channels, private channels, DMs, and group DMs **where the app is installed and Slack permissions/membership allow**

Explicit non-goals for v1:

- billing
- Slack Marketplace flows
- external analytics dashboard
- automatic Slack workspace-admin discovery

## Architecture

The codebase is organized around a **functional core, imperative shell** design:

- **Domain** modules contain poll validation, vote rules, authorization policy, lifecycle rules, result aggregation, and render-friendly view models.
- **Services** orchestrate poll creation, posting, voting, closing, syncing, and App Home publication.
- **Repositories** isolate PostgreSQL persistence concerns.
- **Slack handlers** stay thin: they acknowledge Slack quickly, translate payloads into service calls, and convert service results back into Slack-native responses.
- **Jobs** run scheduled close and sync reconciliation logic.

### High-level flow

1. A user invokes `/poll`, a shortcut, or App Home.
2. The app opens a modal and gathers poll settings.
3. Submission is validated and normalized in the functional core.
4. The poll and options are persisted in PostgreSQL.
5. A Block Kit poll message is posted to Slack.
6. Votes mutate authoritative database state first, then the app updates the shared message.
7. Auto-close and sync workers reconcile overdue polls or missed message updates.

## Directory structure

```text
src/
  app.ts
  config/
  db/
  domain/
  errors/
  jobs/
  lib/
  repositories/
  services/
  slack/
  types/
tests/
  helpers/
  integration/
  unit/
drizzle/
manifest/
```

## Stack

- **Runtime:** Node.js 22+
- **Package manager:** Bun
- **Slack framework:** `@slack/bolt`
- **Database:** PostgreSQL
- **Persistence layer:** Drizzle ORM + explicit SQL migrations
- **Validation:** Zod
- **Logging:** Pino
- **Tests:** Vitest

## Why Socket Mode

Socket Mode is the most practical default for internal/private Slack apps because it:

- avoids public ingress during development
- works well for one internal worker process
- keeps local setup simple
- still supports Slack-native modals, shortcuts, actions, and App Home

If you later want HTTP mode, the current separation between Slack transport and domain/services keeps that migration straightforward.

## Prerequisites

- Node.js 22+
- Bun 1.3+
- PostgreSQL 15+ (or compatible managed Postgres service)
- A Slack workspace where you can install a private app
- Docker 24+ with Docker Compose v2 (optional, for containerized workflows)

## Quick start

### 1. Install dependencies

```bash
bun install
```

### 2. Create environment file

```bash
cp .env.example .env
```

### 3. Configure environment variables

Required values:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `DATABASE_URL`

Optional values:

- `POLL_ADMIN_USER_IDS`
- `DEFAULT_TIMEZONE`
- `LOG_LEVEL`
- `POLL_CLOSE_INTERVAL_SECONDS`
- `POLL_SYNC_INTERVAL_SECONDS`

See `.env.example` for the full list.

### 4. Apply database migrations

```bash
bun run db:migrate
```

### 5. Start the app

```bash
bun run dev
```

For a compiled production build:

```bash
bun run build
bun run start
```

## Docker

The repository includes a production-oriented `Dockerfile` that builds the TypeScript app and runs the compiled worker as a non-root user.

Important container behavior:

- the app still runs in **Socket Mode**
- the container does **not** expose an inbound HTTP port by default
- you must provide the same Slack and database environment variables that native runs use

Build the image:

```bash
bun run docker:build
```

Run database migrations inside the image:

```bash
docker run --rm \
  --env-file .env \
  free-slack-poll:local \
  node dist/db/migrate.js
```

Run the worker:

```bash
docker run --rm \
  --env-file .env \
  free-slack-poll:local
```

If you want a lightweight container check before starting the worker, run the preflight command instead:

```bash
docker run --rm \
  --env-file .env \
  free-slack-poll:local \
  node dist/scripts/preflight.js
```

## Docker Compose

`compose.yaml` provides a small single-host setup with:

- `db` for PostgreSQL
- `migrate` for one-shot schema migrations
- `app` for the long-running Socket Mode worker

Create a Compose-specific env file:

```bash
cp .env.compose.example .env.compose
```

Then update the Slack token values in `.env.compose` as needed. The included `DATABASE_URL` already points at the Compose PostgreSQL service (`db`), so it differs from the default localhost example used for native development.

Start PostgreSQL:

```bash
docker compose --env-file .env.compose up -d db
```

Apply migrations:

```bash
docker compose --env-file .env.compose --profile tools run --rm migrate
```

Start the worker:

```bash
docker compose --env-file .env.compose up -d app
```

Stop everything and remove volumes:

```bash
docker compose --env-file .env.compose down --volumes
```

## Container sanity checks

The repository includes smoke checks that validate the container image, Compose wiring, database connectivity, and migration path without requiring a live Slack workspace.

Validate the Compose configuration:

```bash
bun run compose:config
```

Run the standalone Docker smoke test:

```bash
bun run docker:smoke
```

Run the Docker Compose smoke test:

```bash
bun run compose:smoke
```

These checks use placeholder Slack values and focus on:

- image build success
- required environment variable validation
- PostgreSQL reachability
- migration execution
- container filesystem/runtime assumptions

They intentionally do **not** attempt a live Slack Socket Mode connection.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SLACK_SIGNING_SECRET` | yes | Slack signing secret |
| `SLACK_BOT_TOKEN` | yes | Bot token used by Bolt |
| `SLACK_APP_TOKEN` | yes | Socket Mode app token |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `POLL_ADMIN_USER_IDS` | no | Comma-separated Slack user IDs that can manage any poll |
| `DEFAULT_TIMEZONE` | no | Default timezone label used in docs/config; timestamps are stored in UTC |
| `LOG_LEVEL` | no | Pino log level |
| `POLL_CLOSE_INTERVAL_SECONDS` | no | How often the close worker checks for overdue polls |
| `POLL_SYNC_INTERVAL_SECONDS` | no | How often the sync worker retries message updates |

## Local Slack setup

1. Create a Slack app from `manifest/slack.app-manifest.yaml`
2. Enable Socket Mode
3. Install the app to your workspace
4. Copy the generated secrets/tokens into `.env`
5. Invite the bot to any private channels where you want to post polls

### Important Slack behavior notes

- Public channels can often be handled more easily than private channels.
- For private channels, the bot must be invited before it can post.
- For DMs and group DMs, support depends on Slack installation context and whether the bot is present.
- The modal datetime picker provides a Unix timestamp and Slack controls the user-local picker UX; the app stores timestamps in UTC and renders them with Slack date formatting.

## App manifest

A sample manifest is included at:

- `manifest/slack.app-manifest.yaml`

It defines:

- slash command
- global shortcut
- message shortcut
- App Home
- Socket Mode
- bot scopes for reading/posting in supported conversations

## Database and migrations

Schema and migration assets live in:

- `src/db/schema.ts`
- `drizzle/0000_initial.sql`

Migration behavior:

- migrations are explicit SQL files
- `bun run db:migrate` applies unapplied `.sql` files from `drizzle/`
- applied migrations are tracked in `slack_poll.schema_migrations`

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run preflight
bun run typecheck
bun run lint
bun run test
bun run db:migrate
bun run db:generate
bun run docker:build
bun run docker:smoke
bun run compose:config
bun run compose:smoke
```

## Testing

Run the full automated test suite:

```bash
bun run test
```

Run typechecking:

```bash
bun run typecheck
```

Run linting:

```bash
bun run lint
```

### Testing philosophy

This project intentionally favors **functional core, imperative shell**:

- most correctness-sensitive behavior is pure and unit tested
- service-level integration tests run against in-memory test doubles
- tests do **not** require external PostgreSQL or Slack access

The pure/tested core covers:

- poll validation
- vote mutation rules
- authorization rules
- result aggregation
- render view-model shaping
- poll message block rendering
- core create/post/vote/close service flows
- scheduled close behavior
- App Home publishing logic

Container packaging is also checked in CI through `.github/workflows/docker-sanity-checks.yml`.

## Deployment notes

This version is optimized for a **single worker** deployment:

- one Bolt Socket Mode process
- one scheduler loop for close jobs
- one scheduler loop for sync retries

Recommended production shape:

- managed PostgreSQL
- environment variables injected by your platform
- one long-running process
- logs forwarded from stdout/stderr

For Docker Compose specifically:

- treat it as a **single-host** deployment option
- run `migrate` before `app`
- no published inbound port is required for Socket Mode
- prefer managed secrets/config injection over checked-in env files

## Operational tradeoffs

### Admin model

Admins are configured through `POLL_ADMIN_USER_IDS` rather than discovered dynamically from Slack. This keeps the first version predictable and avoids extra Slack admin-discovery complexity.

### Post-close editing

Broad poll editing after posting is not supported in v1. The primary management actions are:

- voting
- viewing detailed votes for non-anonymous polls
- manual closing
- scheduled closing

### Multiple-choice behavior

Multiple-choice polls use **simple multi-select** semantics in v1.

## Future improvements

- multi-instance worker coordination
- richer audit/event queries
- constrained post-publication editing
- additional moderation flows
- public-distribution hardening
- HTTP mode receiver option
- publish versioned container images
- add container image vulnerability scanning
- add a Compose override for local live-reload development

## License

MIT