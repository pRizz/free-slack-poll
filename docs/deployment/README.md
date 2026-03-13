# Deployment guides

This project already ships with a production-oriented `Dockerfile` and a local `compose.yaml`. The deployment guides in this directory explain how to take that **same three-service Docker Compose shape** and run it on Railway, Render, Fly.io, and Coolify.

## What the Docker Compose stack does

The local Compose file models the application as three services:

| Compose service | What it does | Why it exists |
| --- | --- | --- |
| `db` | Runs PostgreSQL 16 | Stores polls, votes, jobs, and migration history |
| `migrate` | Runs `node dist/db/migrate.js` once | Applies SQL migrations before the worker starts |
| `app` | Runs `node dist/app.js` continuously | Connects to Slack in Socket Mode and processes poll activity |

That separation is the key to every deployment guide in this directory:

- the **database** must exist first
- **migrations** must run before the main worker is considered healthy
- the **worker** should stay running continuously

## Why this app deploys differently from a typical web app

This is a **Slack Socket Mode worker**, not a normal HTTP server.

That has a few important consequences:

- the app does **not** need a public inbound port to receive Slack events
- platform features that assume an HTTP health endpoint may not apply directly
- the most useful success signals are:
  - successful database connectivity
  - successful migration execution
  - application logs that show the worker connected and started

If a platform asks whether this should be deployed as a web service or worker, choose the **worker/background service** model whenever possible.

## Shared prerequisites

Before you use any of the platform-specific guides, make sure you have the following ready.

### 1. A working Slack app

You need a Slack app with Socket Mode enabled and these values available:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

The repository includes a starter manifest at `manifest/slack.app-manifest.yaml`.

### 2. PostgreSQL

The app requires a PostgreSQL connection string in `DATABASE_URL`.

For local Compose, PostgreSQL runs as the `db` container. On hosted platforms, the recommended approach is usually:

- use the platform's managed PostgreSQL offering when available, or
- use another managed PostgreSQL service reachable from the platform

### 3. Environment variables

Required:

- `DATABASE_URL`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

Optional:

- `POLL_ADMIN_USER_IDS`
- `DEFAULT_TIMEZONE`
- `LOG_LEVEL`
- `POLL_CLOSE_INTERVAL_SECONDS`
- `POLL_SYNC_INTERVAL_SECONDS`

The local example values live in `.env.compose.example`.

### 4. A baseline local container check

Before troubleshooting a hosted deployment, it is worth proving that the repository's Docker and Compose flows work from a clean checkout.

Validate the Compose file:

```bash
bun run compose:config
```

Run the Compose smoke test:

```bash
bun run compose:smoke
```

Those checks do **not** connect to Slack. They only prove that:

- the image builds
- required environment variables are wired correctly
- PostgreSQL is reachable
- migrations can run
- the preflight check works inside the container

## Platform capability matrix

The platforms in this directory do not all support the same Docker Compose workflow.

| Platform | Native Docker Compose fit | Recommended database approach | Recommended migration approach | Healthcheck model for this app | Public ingress needed |
| --- | --- | --- | --- | --- | --- |
| [Railway](./railway.md) | Partial. Compose import exists, but this repo's current file is not the cleanest match. | Railway Postgres | Railway pre-deploy command | Avoid HTTP-healthcheck assumptions for the worker | No |
| [Render](./render.md) | No native multi-service Compose deployment | Render Postgres | Render pre-deploy command | Background workers do not use normal web health checks | No |
| [Fly.io](./fly-io.md) | No direct Compose deployment for this stack | Managed Postgres reachable from Fly | `release_command` in `fly.toml` | Prefer worker-style monitoring, not web-service checks | No |
| [Coolify](./coolify.md) | Strong native Compose fit | Compose-managed Postgres or external Postgres | Compose service or one-off Compose migration run | Compose/Dockerfile healthchecks | No |

## How to choose a guide

### Choose Coolify if you want the most literal Compose deployment

Coolify is the closest match to the checked-in `compose.yaml`. It is the best choice if you want to keep the app in a single Compose stack with minimal conceptual translation.

### Choose Railway if you want a Docker-first platform with managed Postgres

Railway can follow the same **Compose architecture**, but the most reliable workflow for this repo is usually:

- managed Postgres on Railway
- one continuously running Docker-based worker service
- a pre-deploy migration command

### Choose Render if you want a clean worker + managed database split

Render does not directly deploy this Compose stack, but its Background Worker and managed Postgres model maps neatly to:

- `db` → Render Postgres
- `migrate` → pre-deploy command
- `app` → Background Worker

### Choose Fly.io if you want low-level control over the runtime

Fly.io is also a translation of the Compose architecture rather than a literal Compose deployment. It is a strong fit if you are comfortable with:

- a generated `fly.toml`
- release-time migration commands
- a worker-style application with no public HTTP service

## Common verification checklist

No matter which platform you use, a healthy deployment should satisfy all of the following:

1. the platform can build the image from the repository `Dockerfile`
2. PostgreSQL is reachable from the running workload
3. `node dist/db/migrate.js` completes successfully
4. the long-running workload starts with `node dist/app.js`
5. logs show the worker is running in Socket Mode

The most useful log messages to look for are:

- migration success logs from the migration step
- `Container preflight passed.`
- `Slack poll app started in Socket Mode.`

## Guides

- [Railway deployment guide](./railway.md)
- [Render deployment guide](./render.md)
- [Fly.io deployment guide](./fly-io.md)
- [Coolify deployment guide](./coolify.md)
