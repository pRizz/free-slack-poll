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
2. Start with `./scripts/railway-assist.sh doctor` unless the user already gave enough Railway state.
3. For first-time local CLI setup, use `./scripts/railway-assist.sh bootstrap`.
4. For manual deployments, use `./scripts/railway-assist.sh deploy`.
5. For status and troubleshooting, use `status`, `logs`, `redeploy`, or `restart` through the helper.

## Guardrails

- Prefer linking an existing Railway project, environment, and service.
- Do not create or destroy Railway resources unless the user explicitly asks.
- Do not push variables from a local env file unless the user explicitly asks.
- Do not import `DATABASE_URL` from a local env file unless the user explicitly confirms that the value is meant for Railway.
- Keep GitHub autodeploy and `Wait for CI` guidance aligned with `docs/deployment/railway.md`; those are still dashboard-first tasks for this repo.

## Commands

```bash
./scripts/railway-assist.sh doctor
./scripts/railway-assist.sh bootstrap --project <project> --environment production --service <service>
./scripts/railway-assist.sh vars-push --env-file .env.railway
./scripts/railway-assist.sh deploy --verify=full
./scripts/railway-assist.sh status
./scripts/railway-assist.sh logs --latest
```

For non-interactive agent runs, prefer `deploy --ci` or `deploy --detach` when long log streams would be noisy.
