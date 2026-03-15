# Local Env Files And Railway Sync

Use this reference when the user wants to keep secrets in local gitignored env files, update those files, or push them to Railway with the CLI.

## Which local env file is for what

- `.env`: native local development
- `.env.compose`: Docker Compose local development
- `.env.railway`: Railway-specific variable staging file for `vars-push`

These files are gitignored by the repo's `.gitignore`. The checked-in examples are:

- `.env.example`
- `.env.compose.example`
- `.env.railway.example`

## Recommended repo-specific workflow

1. Copy the checked-in examples into local gitignored files if they do not exist yet.
2. Put the Slack runtime values into the relevant local files:
   - `SLACK_SIGNING_SECRET`
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
3. Keep database values aligned with the runtime:
   - `.env` uses the localhost Postgres URL
   - `.env.compose` uses the Compose `db` hostname
   - `.env.railway` should usually omit `DATABASE_URL`
4. Use `.env.railway` as the source when pushing variables to Railway.
5. Run a dry run first if the file is new or the values were just entered.
6. Run the real sync.
7. Deploy separately after the variables are staged.

## Commands

Dry run:

```bash
./scripts/railway-assist.sh vars-push --env-file .env.railway --dry-run
```

Real sync:

```bash
./scripts/railway-assist.sh vars-push --env-file .env.railway
```

Deploy after sync:

```bash
./scripts/railway-assist.sh deploy --verify=full
```

## Important guardrails

- `vars-push` uses `--skip-deploys`, so syncing variables does not automatically redeploy the service.
- `vars-push` intentionally skips `DATABASE_URL` unless `--include-database-url` is explicitly used.
- For this repo, do not store or request `SLACK_CLIENT_SECRET` during normal setup. It is not used by the current single-workspace Socket Mode deployment.
- If the user only wants Railway updated, `.env.railway` is sufficient. Updating `.env` and `.env.compose` is optional and should match the user's local-development intent.

## Secret-handling note

The helper is convenient for staging a whole env file, but it currently sends values to `railway variable set` as `KEY=VALUE` arguments.

If the user wants stricter secret handling for one-off updates, prefer Railway CLI stdin mode instead:

```bash
printf '%s' 'value' | railway variable set --service app --skip-deploys --stdin KEY_NAME
```

This avoids placing the secret directly on the command line.
