# Deploy on Railway

This guide is for teams that want to keep the repository's **Docker / Docker Compose deployment shape** while using Railway for managed infrastructure.

## Who this guide is for

Use this guide if you want:

- Railway to build the checked-in `Dockerfile`
- Railway-managed PostgreSQL instead of the local Compose `db` container
- a single long-running worker process for Slack Socket Mode
- migrations to run automatically before each deployment

Do **not** treat this guide as "upload `compose.yaml` and everything will work unchanged." Railway does have Docker Compose import support, but the current repository Compose file is not the cleanest match because it uses:

- `build:` from the local repository
- a profile-gated `migrate` service
- a containerized local Postgres service that is better replaced with Railway Postgres

For this app, the most reliable Railway flow is to keep the **same Compose architecture** while mapping it to Railway-native resources.

## How the Compose stack maps to Railway

| Local Compose service | Railway equivalent |
| --- | --- |
| `db` | Railway Postgres service |
| `migrate` | Railway pre-deploy command: `node dist/db/migrate.js` |
| `app` | Railway long-running service built from the repository `Dockerfile` |

That mapping preserves the important sequence:

1. provision a database
2. run migrations
3. start the Slack worker

## What is configured in code vs in Railway

This repository now checks in a root `railway.json` that defines the per-deployment build and runtime behavior Railway should use:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "preDeployCommand": ["node dist/db/migrate.js"],
    "startCommand": "node dist/app.js",
    "restartPolicyType": "ALWAYS"
  }
}
```

Treat that file as the source of truth for:

- building from the checked-in `Dockerfile`
- running migrations before each deployment
- starting the long-running Socket Mode worker
- restarting the worker if it crashes

Keep the following in the Railway dashboard:

- the GitHub repository connection
- the deployment trigger branch (`main`)
- the `Wait for CI` toggle
- the PostgreSQL service
- environment variables and secrets
- networking choices such as leaving public ingress and HTTP healthchecks unset

Why this split matters:

- config-as-code keeps the build and worker command behavior versioned with the application
- the Railway dashboard still owns project-level integrations and secrets
- Railway config files override dashboard deploy settings for each deployment, but do not rewrite the dashboard values

## Before you start

Have the following ready:

- a Railway account and project
- this repository connected to Railway
- Slack credentials:
  - `SLACK_SIGNING_SECRET`
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- optional runtime settings if you want to override the defaults:
  - `POLL_ADMIN_USER_IDS`
  - `DEFAULT_TIMEZONE`
  - `LOG_LEVEL`
  - `POLL_CLOSE_INTERVAL_SECONDS`
  - `POLL_SYNC_INTERVAL_SECONDS`

It is also a good idea to verify the local Docker flows once before you deploy:

```bash
bun run compose:config
bun run compose:smoke
```

## Step 1: Create a Railway project

1. Open Railway and create a new project.
2. Connect the Git repository that contains this app.
3. Confirm that Railway is pointing at the repository root, because the root `Dockerfile` is what the deployment should build.

Why this matters:

- the project root contains the production `Dockerfile`
- the `Dockerfile` already compiles the app and sets the default runtime command to `node dist/app.js`
- the checked-in `railway.json` tells Railway to deploy this repository as a Dockerfile-built worker service

## Step 2: Add a PostgreSQL service

1. In the Railway project, add a PostgreSQL service.
2. Wait for Railway to finish provisioning it.
3. Locate the generated database connection string.
4. Plan to use that connection string as `DATABASE_URL` for the worker service.

Why this matters:

- the checked-in Compose file uses a local `db` container only for single-host deployments
- on Railway, managed Postgres is more durable and simpler than running PostgreSQL inside your app stack

## Step 3: Create the application service from the Dockerfile

1. Add a new service from your repository source.
2. Choose the repository root as the build context.
3. Let Railway detect the root `Dockerfile`.
4. Keep the build and start command aligned with the checked-in `railway.json`.

The runtime command Railway should use is:

```text
node dist/app.js
```

Why this matters:

- that is the long-running worker that replaces the local Compose `app` service
- you do not need a separate web server process for Socket Mode
- keeping the command in `railway.json` makes the deployment behavior reviewable in Git

## Step 4: Configure environment variables and secrets

Set the following variables on the application service.

### Required variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Railway Postgres connection string |
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

- the app validates these variables at startup
- a missing required variable will cause the container to fail before the worker is usable

## Step 5: Confirm the pre-deploy migration command from `railway.json`

The checked-in Railway config already defines this pre-deploy command:

```bash
node dist/db/migrate.js
```

Confirm Railway shows that command on the deployment details page or service settings for the application service.

Why this is the Railway equivalent of the Compose `migrate` service:

- local Compose runs migrations with `docker compose --profile tools run --rm migrate`
- on Railway, the most natural replacement is to run the exact same compiled migration entrypoint before the main worker starts

Why you should do this even on the first deploy:

- the worker expects the schema to exist
- running migrations before startup avoids a deploy that boots successfully but fails when it first touches the database

## Step 6: Configure GitHub autodeploys from `main`

In the application service settings:

1. keep the service source connected to this repository
2. set the trigger branch to `main`
3. leave automatic deployments enabled
4. enable `Wait for CI`

Why this matters:

- Railway automatically deploys new commits from the linked branch
- `Wait for CI` ensures Railway waits for the repository's GitHub Actions checks before it starts a deployment
- this repository already has a `push` workflow on `main` in `.github/workflows/docker-sanity-checks.yml`, so it satisfies Railway's CI gate requirement

Important edge case:

- if a commit is authored by someone who has not linked their GitHub identity to Railway, Railway may require a manual deployment approval before it proceeds

## Step 7: Do not optimize for HTTP ingress

This app does not need public HTTP traffic for Slack events, because it uses Socket Mode.

That means:

- you do **not** need to expose a public application port for Slack callbacks
- you do **not** need to create a public domain just to make the app work
- you should be cautious with any Railway setting that assumes readiness comes from an HTTP endpoint

If Railway suggests or expects an HTTP healthcheck:

- do not point it at a fake endpoint that does not exist
- prefer worker-style deployment assumptions over web-service assumptions

Do not set a `healthcheckPath` in Railway or in `railway.json` for this version:

- Railway healthchecks are HTTP-based
- this worker does not expose an HTTP readiness endpoint
- the most useful readiness signals here are successful migrations and runtime logs

## Step 8: Deploy

Once the variables and pre-deploy command are set:

1. trigger the first deployment manually from the latest `main` commit
2. watch the build logs
3. confirm the pre-deploy migration step runs
4. confirm Railway starts the long-running worker container after migrations succeed

The expected high-level sequence is:

1. Railway builds the Docker image
2. Railway runs `node dist/db/migrate.js`
3. Railway starts the service with `node dist/app.js`

After that first successful deployment:

1. push a no-op commit to `main`
2. confirm Railway moves the deployment into `WAITING` while GitHub Actions runs
3. confirm Railway deploys automatically after the checks succeed

If the GitHub workflow fails, Railway should skip the deployment instead of starting it anyway.

## Run migrations manually when needed

If you ever need to reason about the migration step separately, use the same command Railway uses:

```bash
node dist/db/migrate.js
```

That is the direct counterpart of the local Compose flow:

```bash
docker compose --env-file .env.compose --profile tools run --rm migrate
```

## Verify the deployment

After deployment, verify all of the following.

### 1. The build succeeded

The Docker build should finish without errors and should use the repository's root `Dockerfile`.

### 2. The migration step succeeded

Inspect the pre-deploy logs and confirm that `node dist/db/migrate.js` completed successfully.

### 3. The worker started

Inspect the runtime logs for the running service and look for evidence like:

- `Slack poll app started in Socket Mode.`

### 4. Database connectivity is healthy

If the worker starts and then exits immediately, the most common causes are:

- a bad `DATABASE_URL`
- a missing migration
- missing Slack secrets

### 5. No HTTP healthcheck path is configured

Confirm the service is not configured with an HTTP healthcheck path for this worker deployment.

### 6. Optional preflight check

The image also contains a preflight command:

```bash
node dist/scripts/preflight.js
```

That command validates:

- environment loading
- database connectivity
- presence of SQL migrations in the image

If Railway provides a way to run an ad hoc command for the service, this is a useful verification command after the first successful deploy.

## Troubleshooting

### Railway keeps acting like this should be a web app

Symptom:

- the deployment configuration keeps pushing you toward domains, ports, or HTTP healthchecks

What to do:

- remember that this app is a background worker in Socket Mode
- keep the service focused on running the container continuously
- avoid inventing a fake web endpoint just to satisfy a web-first flow

### The service starts but exits during boot

Check:

- `DATABASE_URL`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

The environment loader requires all four.

### Migrations fail during pre-deploy

Check:

- that `DATABASE_URL` points to the Railway Postgres instance you intended
- that the Postgres service finished provisioning
- that the app service and database are in the same project and environment

### You want to try Railway's Compose import anyway

That can work for some Compose stacks, but for this repository you should expect extra adaptation work. At minimum, review these differences first:

- replace or rethink the local `db` service in favor of managed Postgres
- confirm whether Railway accepts the current `build:` usage
- decide how you want the profile-gated `migrate` service to run

If your goal is a reliable production deployment, the service mapping in this guide is the safer path.
