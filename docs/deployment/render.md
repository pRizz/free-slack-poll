# Deploy on Render

This guide explains how to deploy the app on Render while staying faithful to the repository's existing **Docker Compose flow**.

## Who this guide is for

Use this guide if you want:

- Render to build the checked-in `Dockerfile`
- a managed PostgreSQL database on Render
- a long-running worker process instead of a public web service
- migrations to run automatically before each deployment

Render does **not** natively deploy this repository's multi-service Docker Compose stack as-is. The correct mental model is:

- keep the same three-part Compose architecture
- map each part to the Render feature that plays the same role

## How the Compose stack maps to Render

| Local Compose service | Render equivalent |
| --- | --- |
| `db` | Render Postgres |
| `migrate` | Render pre-deploy command: `node dist/db/migrate.js` |
| `app` | Render Background Worker built from the repository `Dockerfile` |

This is the cleanest Render translation because the app is a **Slack Socket Mode worker**, not an HTTP service.

## Before you start

Have the following ready:

- a Render account
- this repository connected to Render
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

It is also worth validating the local container workflow once:

```bash
bun run compose:config
bun run compose:smoke
```

## Step 1: Create a Render Postgres database

1. In Render, create a new PostgreSQL database.
2. Choose the region where you want the worker to run.
3. Wait for the database to finish provisioning.
4. Note the database connection details that Render exposes.

Why this matters:

- the checked-in Compose file uses a containerized local `db` service only for single-host Docker Compose
- on Render, the managed database is the equivalent of that service

## Step 2: Create a Background Worker service

1. Create a new Render service from this repository.
2. Choose the **Background Worker** service type.
3. Choose **Docker** as the environment so Render builds the repository `Dockerfile`.
4. Confirm the root of the repository is used as the service root.

Why the Background Worker type matters:

- the app is a continuously running process
- it does not need to accept inbound HTTP traffic
- Render's normal web-service healthcheck model does not fit this workload

## Step 3: Keep the default runtime command unless you intentionally override it

The Docker image already starts with:

```text
node dist/app.js
```

In many cases you can leave the start command empty and let the image default apply.

Only override the start command if you have a specific reason to do so. If you do override it, use:

```bash
node dist/app.js
```

Why this matters:

- that is the long-running process that replaces the local Compose `app` service
- using a different command can accidentally skip the real worker entrypoint

## Step 4: Set environment variables

Add these required variables to the Background Worker service.

### Required variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Render Postgres connection string |
| `SLACK_SIGNING_SECRET` | Your Slack signing secret |
| `SLACK_BOT_TOKEN` | Your Slack bot token |
| `SLACK_APP_TOKEN` | Your Slack Socket Mode app token |

### Optional variables

| Variable | Suggested starting value |
| --- | --- |
| `DEFAULT_TIMEZONE` | `UTC` |
| `LOG_LEVEL` | `info` |
| `POLL_ADMIN_USER_IDS` | comma-separated Slack user IDs |
| `POLL_CLOSE_INTERVAL_SECONDS` | `30` |
| `POLL_SYNC_INTERVAL_SECONDS` | `15` |

Why this matters:

- the app validates environment variables at startup
- a missing required variable causes the process to exit before the worker can connect to Slack

## Step 5: Configure the pre-deploy migration command

Add this pre-deploy command to the Background Worker:

```bash
node dist/db/migrate.js
```

Why this is the correct Render equivalent of Compose migrations:

- local Compose treats migrations as a separate one-shot service
- Render's pre-deploy command is the closest built-in equivalent
- it guarantees the schema step runs before the worker starts serving real workload

## Step 6: Deploy the worker

Start the deployment and watch the logs closely.

A healthy deployment should follow this order:

1. Render builds the Docker image from the repository `Dockerfile`
2. Render runs the pre-deploy migration command
3. Render starts the Background Worker with `node dist/app.js`

## Run migrations manually when needed

If you need to reason about migrations outside the normal deployment flow, the command is still:

```bash
node dist/db/migrate.js
```

That is the direct platform translation of the local Compose command:

```bash
docker compose --env-file .env.compose --profile tools run --rm migrate
```

## Verify the deployment

After the worker is live, check each of the following.

### 1. The image built successfully

The build logs should show Render using the repository `Dockerfile`.

### 2. The pre-deploy command succeeded

Look at the deploy logs and confirm that the migration command completed successfully before the runtime process started.

### 3. The worker booted successfully

Look for application logs such as:

- `Slack poll app started in Socket Mode.`

### 4. The process stays running

A healthy Background Worker should remain up continuously. If it exits immediately, treat that as a startup failure and inspect the logs.

### 5. Optional preflight verification

The image also contains a preflight command:

```bash
node dist/scripts/preflight.js
```

That command is useful if you want a quick confirmation that:

- the environment is valid
- Postgres is reachable
- migrations are present in the built image

## Troubleshooting

### You accidentally created a Web Service

Symptom:

- Render asks for or relies on HTTP health checks
- the UI and deploy flow assume inbound traffic

Fix:

- recreate the service as a **Background Worker**

That matches the actual runtime model of this app.

### The worker exits immediately after boot

Check:

- `DATABASE_URL`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Those are the most common startup blockers.

### Pre-deploy migrations fail

Check:

- that `DATABASE_URL` points at the intended Render Postgres instance
- that the database finished provisioning
- that the worker and database are in compatible regions

### You expect an HTTP health endpoint

Render health checks are designed for web services, not background workers. For this app, the stronger success signal is:

- migration success
- stable runtime logs
- `Slack poll app started in Socket Mode.`
