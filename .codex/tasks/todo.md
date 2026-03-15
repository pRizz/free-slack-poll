# Todo

- [x] Add Railway config-as-code for Dockerfile builds and worker startup.
- [x] Update the Railway deployment guide with repo-vs-dashboard ownership and `main` autodeploy instructions.
- [x] Verify local build and container-oriented deployment checks.

## Verification

- [x] `bun run compose:config`
- [x] `bun run build`
- [x] `bun run docker:smoke`
- [x] `bun run compose:smoke`

## Completion Review

- Added root `railway.json` so Railway build/start/pre-deploy behavior is versioned with the codebase.
- Updated the Railway deployment guide to document `main` autodeploys, `Wait for CI`, dashboard-owned settings, and the no-HTTP-healthcheck worker model.
- Local Docker-oriented verification passed.
- Residual risk: live Railway behavior still depends on dashboard setup, service variables, and an actual `main` push in the linked Railway project.

## Railway CLI Assistant

- [x] Add a repo helper for Railway CLI bootstrap, deploy, status, logs, and variable sync workflows.
- [x] Add Railway-specific npm scripts, env template, and deployment guide updates for the helper.
- [x] Create a repo-specific Codex skill for Railway bootstrap and manual deploy assistance.

## Railway CLI Verification

- [x] `bash -n scripts/railway-assist.sh`
- [x] `./scripts/railway-assist.sh help`
- [x] Mocked `bootstrap` flow with a stubbed `railway` CLI
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run build`

## Railway CLI Completion Review

- Added `scripts/railway-assist.sh` for first-time CLI bootstrap and ongoing manual Railway deployments.
- Added `.env.railway.example` and package scripts so variable staging and manual deploys are easier to run safely.
- Updated Railway docs and README to explain when to use the helper and why `DATABASE_URL` is skipped by default during env sync.
- Created a global Codex skill at `~/.codex/skills/free-slack-poll-railway` so future Railway work for this repo reuses the same workflow.
- Residual risk: live Railway operations still require the real Railway CLI, a linked project/service, and user confirmation before any production-side changes.
