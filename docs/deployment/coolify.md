# Deploy on Coolify

This guide explains how to deploy the app on Coolify using the repository's **Docker Compose flow** as directly as possible.

## Who this guide is for

Use this guide if you want:

- Coolify to deploy the app from a Compose file
- PostgreSQL, migrations, and the worker to stay conceptually grouped as one stack
- a platform that is comfortable with Compose-native deployment patterns

Coolify is the closest match to the checked-in `compose.yaml` of the four platforms covered in this repository.

## How the Compose stack maps to Coolify

| Local Compose service | Coolify equivalent |
| --- | --- |
| `db` | Compose-managed PostgreSQL service |
| `migrate` | Compose-managed one-shot migration service |
| `app` | Compose-managed long-running worker service |

That means this guide stays closest to the repository's original Docker Compose model.

## Before you start

Have the following ready:

- a running Coolify instance and a target server
- this repository connected to Coolify
- Slack credentials:
  - `SLACK_SIGNING_SECRET`
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- optional runtime settings if you want custom values:
  - `POLL_ADMIN_USER_IDS`
  - `DEFAULT_TIMEZONE`
  - `LOG_LEVEL`
  - `POLL_CLOSE_INTERVAL_SECONDS`
  - `POLL_SYNC_INTERVAL_SECONDS`

It is also helpful to validate the local Compose setup once:

```bash
bun run compose:config
bun run compose:smoke
```

## Step 1: Create a new Docker Compose resource

1. In Coolify, create a new application or service from your Git repository.
2. Choose the Docker Compose deployment mode or build pack.
3. Point Coolify at the repository root.
4. Set the Compose file path to `compose.yaml`.

Why this matters:

- `compose.yaml` is already the source of truth for the stack layout
- the file contains the three roles you need: database, migrations, and worker

## Step 2: Review what Coolify will deploy

Before the first deployment, confirm that Coolify sees these services:

- `db`
- `migrate`
- `app`

Also confirm that it will build the application image from the repository root, because both `migrate` and `app` use:

```yaml
build:
  context: .
```

Why this matters:

- both the migration container and the long-running worker depend on the same built image
- if the build context is wrong, both services will fail in different ways

## Step 3: Set environment variables and secrets

Configure the same values that the local Compose flow expects.

### Required variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SLACK_SIGNING_SECRET` | Your Slack signing secret |
| `SLACK_BOT_TOKEN` | Your Slack bot token |
| `SLACK_APP_TOKEN` | Your Slack Socket Mode app token |

### Optional variables

| Variable | Suggested starting value |
| --- | --- |
| `POSTGRES_DB` | `free_slack_poll` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `postgres` |
| `POLL_ADMIN_USER_IDS` | comma-separated Slack user IDs |
| `DEFAULT_TIMEZONE` | `UTC` |
| `LOG_LEVEL` | `info` |
| `POLL_CLOSE_INTERVAL_SECONDS` | `30` |
| `POLL_SYNC_INTERVAL_SECONDS` | `15` |

If you are using the Compose-managed `db` service, `DATABASE_URL` should point at that internal service, for example:

```text
postgres://postgres:postgres@db:5432/free_slack_poll
```

Why this matters:

- the app validates the required environment variables on startup
- the `db`, `migrate`, and `app` services all need consistent database wiring

## Step 4: Keep the worker private unless you have another reason to expose it

This application runs in Slack Socket Mode. That means:

- it does not need inbound Slack HTTP traffic
- it does not need a public web URL to process events
- it does not need a published HTTP port to function as a worker

If Coolify asks whether you want to expose the service through a domain or public port, the answer for the `app` worker is usually **no**.

## Step 5: Handle the migration service intentionally

This is the most important part of the Coolify deployment.

The repository's Compose file defines migrations as a separate one-shot service:

```text
node dist/db/migrate.js
```

That is exactly what you want conceptually, but you need to decide how your Coolify version handles the current Compose file because `migrate` is behind:

```yaml
profiles: ["tools"]
```

### Recommended decision process

Use one of the following two paths.

### Path A: Your Coolify version supports the existing profile-based flow

If your Coolify setup fully understands Compose profiles and lets you run the profiled service deliberately:

1. deploy the stack
2. start or trigger the `migrate` service before the main worker is considered ready
3. once migrations complete successfully, allow the long-running `app` service to continue

### Path B: Your Coolify version does not clearly support the profile-based flow

If profile handling is missing or unclear, use a platform-specific Compose variant for deployment.

The safe idea is:

1. copy `compose.yaml` to a deployment-specific file such as `compose.coolify.yaml`
2. remove the `profiles: ["tools"]` line from `migrate`
3. keep the same migration command:

   ```yaml
   command: ["node", "dist/db/migrate.js"]
   ```

4. make sure `migrate` is treated as a one-shot service rather than a permanently healthy runtime service
5. if your Coolify version supports excluding one-shot services from health aggregation, use that capability for `migrate`

Why this matters:

- migrations should run intentionally
- a one-shot service should not be judged the same way as the long-running worker
- ignoring the migration step is the easiest way to get a deployment that builds but fails at runtime

## Step 6: Deploy the stack

Start the deployment after the environment variables are set and your migration plan is chosen.

A healthy deployment should look like this:

1. Coolify builds the app image from the repository
2. PostgreSQL starts and becomes healthy
3. the migration command runs successfully
4. the long-running worker starts with `node dist/app.js`

## Run migrations manually when needed

The migration command itself does not change across platforms:

```bash
node dist/db/migrate.js
```

In local Docker Compose, the equivalent action is:

```bash
docker compose --env-file .env.compose --profile tools run --rm migrate
```

If you need to reproduce the same logic manually in Coolify, run the image with that migration command before or during deployment according to your Coolify workflow.

## Verify the deployment

After deployment, verify each of the following.

### 1. PostgreSQL became healthy

The `db` service should pass its readiness checks before the rest of the stack relies on it.

### 2. Migrations completed successfully

The migration logs should show that:

```text
node dist/db/migrate.js
```

completed without error.

### 3. The worker started successfully

Inspect the `app` logs and look for:

- `Slack poll app started in Socket Mode.`

### 4. Optional preflight verification

The image also contains a preflight command:

```bash
node dist/scripts/preflight.js
```

That command validates:

- environment loading
- database connectivity
- presence of the SQL migrations in the image

### 5. The worker remains private

Confirm you did not expose the worker publicly unless you intended to do so for some unrelated operational reason.

## Troubleshooting

### The migration service is marked unhealthy even though it finished

That usually means Coolify is treating a one-shot job like a long-running service.

What to do:

- use a deployment flow that treats `migrate` as intentional one-shot work
- if your Coolify version supports excluding one-shot services from stack health, apply that to `migrate`

### Environment variable interpolation fails

Check:

- that every required variable is defined in Coolify
- that `DATABASE_URL` matches the database service you actually intend to use
- that the Compose file path is correct

### The worker is exposed through a domain even though it should not be

This app does not need public HTTP ingress for Slack Socket Mode. Remove the public exposure unless you have a separate operational reason to keep it.

### The stack builds, but the worker crashes during boot

Check:

- `DATABASE_URL`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- whether migrations ran successfully before the worker started
