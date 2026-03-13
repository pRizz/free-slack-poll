# Deploy on Fly.io

This guide explains how to deploy the app on Fly.io while preserving the repository's existing **Docker Compose architecture**.

## Who this guide is for

Use this guide if you want:

- Fly.io to build the checked-in `Dockerfile`
- a worker-style deployment with no public HTTP endpoint
- migrations to run automatically during deployment
- PostgreSQL reachable from Fly.io

Fly.io does **not** natively deploy this repository's `compose.yaml` as a multi-service stack. The right approach is to translate the Compose roles into Fly's runtime model.

## How the Compose stack maps to Fly.io

| Local Compose service | Fly.io equivalent |
| --- | --- |
| `db` | Managed PostgreSQL reachable from Fly.io |
| `migrate` | `release_command = "node dist/db/migrate.js"` |
| `app` | One always-on Fly Machine running the Docker image |

This works well because the app is not an HTTP web app. It is a **Slack Socket Mode worker** that needs outbound connectivity and a durable database, not a public request router.

## Before you start

Have the following ready:

- a Fly.io account
- `flyctl` installed and authenticated
- Slack credentials:
  - `SLACK_SIGNING_SECRET`
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- a PostgreSQL instance reachable from Fly.io
- optional runtime settings if you want non-default values:
  - `POLL_ADMIN_USER_IDS`
  - `DEFAULT_TIMEZONE`
  - `LOG_LEVEL`
  - `POLL_CLOSE_INTERVAL_SECONDS`
  - `POLL_SYNC_INTERVAL_SECONDS`

It is also worth validating the local container workflow once:

```bash
bun run compose:config
bun run compose:smoke
```

## Step 1: Initialize the Fly app without deploying

From the repository root, run:

```bash
fly launch --no-deploy
```

This is the safest way to start because it lets Fly generate `fly.toml` without immediately trying to launch the app.

Why this matters:

- you want to review the generated config before the first deployment
- this app should behave like a worker, not a public web service

## Step 2: Review the generated `fly.toml`

After `fly launch --no-deploy`, open `fly.toml` and review it carefully.

For this app, the important goal is:

- keep the Docker build
- keep one always-on runtime process
- avoid unnecessary public HTTP service configuration

If Fly generated public web-service sections such as `[[services]]` or `[http_service]`, remove them unless you intentionally want public ingress for some unrelated reason.

Why this matters:

- Slack Socket Mode does not require a public HTTP listener
- leaving web-service routing in place can make the app look like a normal web app when it is not

## Step 3: Add the release-time migration command

In `fly.toml`, add or confirm a deploy section like this:

```toml
[deploy]
  release_command = "node dist/db/migrate.js"
```

Why this is the Fly equivalent of the Compose `migrate` service:

- local Compose runs a separate one-shot migration container
- Fly's `release_command` runs once during deployment, before the new runtime becomes active

## Step 4: Set application secrets and environment variables

Use Fly secrets for sensitive values:

```bash
fly secrets set \
  DATABASE_URL="postgres://..." \
  SLACK_SIGNING_SECRET="..." \
  SLACK_BOT_TOKEN="..." \
  SLACK_APP_TOKEN="..."
```

Set optional values the same way if you want to override the defaults:

```bash
fly secrets set \
  DEFAULT_TIMEZONE="UTC" \
  LOG_LEVEL="info" \
  POLL_CLOSE_INTERVAL_SECONDS="30" \
  POLL_SYNC_INTERVAL_SECONDS="15"
```

If you use `POLL_ADMIN_USER_IDS`, set it as a comma-separated string:

```bash
fly secrets set POLL_ADMIN_USER_IDS="U01234567,U08976543"
```

Why this matters:

- the app validates required environment variables during startup
- missing required secrets will cause startup failure immediately

## Step 5: Make sure PostgreSQL is reachable

Before the first deploy, confirm that the `DATABASE_URL` you set points to the PostgreSQL instance you actually want the app to use.

The app requires:

- a reachable host
- valid credentials
- a database that the migration command can modify

Why this matters:

- the release command will fail if the database is unreachable
- even if the worker image builds successfully, deployment is not healthy without a working database connection

## Step 6: Deploy the app

Run:

```bash
fly deploy
```

The expected deployment order is:

1. Fly builds the Docker image from the repository `Dockerfile`
2. Fly runs the release command: `node dist/db/migrate.js`
3. Fly starts the application Machine using the image's default command: `node dist/app.js`

## Run migrations manually when needed

The migration command remains the same everywhere:

```bash
node dist/db/migrate.js
```

That is the platform translation of the local Compose command:

```bash
docker compose --env-file .env.compose --profile tools run --rm migrate
```

## Verify the deployment

After deployment, verify all of the following.

### 1. The build succeeded

The deployment logs should show Fly building from the repository `Dockerfile`.

### 2. The release command succeeded

Check the deployment output and confirm that:

```text
node dist/db/migrate.js
```

completed successfully before the runtime Machine was promoted.

### 3. The Machine is running

Inspect the app status:

```bash
fly status
```

You want to see a running Machine for the app.

### 4. Runtime logs show the worker started

Inspect the logs:

```bash
fly logs
```

Look for:

- `Slack poll app started in Socket Mode.`

### 5. Optional preflight verification

The image also contains:

```bash
node dist/scripts/preflight.js
```

That command is useful when you want to confirm:

- environment loading works
- database connectivity works
- migrations are present in the image

## Monitoring and healthcheck guidance

Because this is a worker with no public HTTP service:

- you do not need a public route
- you do not need an HTTP health endpoint
- worker uptime and logs are more meaningful than web health checks

If you later add Fly monitoring checks, treat them as worker monitoring rather than public traffic readiness.

## Troubleshooting

### Fly generated a web-facing config

Symptom:

- `fly launch` created HTTP or service sections that assume a public port

Fix:

- remove those sections if you do not need public ingress
- keep the app focused on being a long-running worker

### The release command fails

Check:

- `DATABASE_URL`
- database reachability from Fly
- database credentials
- whether the target database already exists and accepts connections

### The Machine boots and then exits

Check:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `DATABASE_URL`

Those are the most common reasons for a failed worker boot.

### You expected Docker Compose to deploy directly

Fly.io is not using `compose.yaml` as a literal deployment artifact here. Instead, it is using the same architecture in Fly terms:

- managed database
- release-time migration step
- one continuous runtime process
