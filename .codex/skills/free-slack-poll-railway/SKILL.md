---
name: free-slack-poll-railway
description: Use when bootstrapping, manually deploying, or troubleshooting the free-slack-poll repo on Railway with the Railway CLI. Prefer the repo helper scripts/railway-assist.sh and the checked-in docs/deployment/railway.md workflow over ad hoc commands.
---

# Free Slack Poll Railway

Use this skill only when the current workspace is the `free-slack-poll` repository or one of its worktrees.

## Workflow

1. Read only the files you need:
   - `railway.json`
   - `docs/deployment/railway.md`
   - `scripts/railway-assist.sh`
   - `.env.railway.example` when variable sync is relevant
   - `references/slack-tokens.md` when Slack credentials are missing
2. Start with `./scripts/railway-assist.sh doctor` unless the user already gave enough Railway state.
3. If `doctor` reports that Railway CLI is missing, install it before doing anything else. Prefer:
   - `brew install railway`
   - fall back to `npm install -g @railway/cli` or `bun add -g @railway/cli`
4. For first-time local CLI setup, use `./scripts/railway-assist.sh bootstrap`.
   - If the Railway project already exists, pass `--project <name-or-id>`.
   - If it does not exist yet, use `--create-project --project <name> --workspace <workspace>`.
5. For manual deployments, use `./scripts/railway-assist.sh deploy`.
6. For status and troubleshooting, use `status`, `logs`, `redeploy`, or `restart` through the helper.
7. If Railway bootstrap is blocked on missing Slack secrets, load `references/slack-tokens.md` and give the user the recommended Slack app/token path for this repo before asking for credentials.
   - Be explicit that Slack's Socket Mode examples often only require `xoxb` + `xapp`, but this repo currently also validates and passes `SLACK_SIGNING_SECRET`, so the user should gather all three values.

## Guardrails

- Prefer linking an existing Railway project, environment, and service.
- Do not create or destroy Railway resources unless the user explicitly asks.
- Do not push variables from a local env file unless the user explicitly asks.
- Do not import `DATABASE_URL` from a local env file unless the user explicitly confirms that the value is meant for Railway.
- For this repo, prefer Slack app creation from `manifest/slack.app-manifest.yaml` over creating the app from scratch.
- Do not ask for Slack user tokens or config tokens for normal Railway runtime; this repo needs the signing secret, bot token, and app-level token.
- If the user asks about alternatives, explain the difference between:
  - the recommended manifest-driven single-workspace install for this repo
  - advanced manifest automation with config tokens
  - a full OAuth distribution flow that would require client ID, client secret, redirect handling, and installation storage
- Keep GitHub autodeploy and `Wait for CI` guidance aligned with `docs/deployment/railway.md`; those are still dashboard-first tasks for this repo.

## Commands

```bash
./scripts/railway-assist.sh doctor
./scripts/railway-assist.sh bootstrap --create-project --project free-slack-poll --workspace "My Workspace" --service app
./scripts/railway-assist.sh bootstrap --project <project> --environment production --service <service>
./scripts/railway-assist.sh vars-push --env-file .env.railway
./scripts/railway-assist.sh deploy --verify=full
./scripts/railway-assist.sh status
./scripts/railway-assist.sh logs --latest
```

For non-interactive agent runs, prefer `deploy --ci` or `deploy --detach` when long log streams would be noisy.
