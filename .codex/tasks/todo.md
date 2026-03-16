# Todo

## Basic Slack UAT Regression

- [x] Define a basic Slack UAT checklist for poll creation, voting, manager UI, and close flows.
- [x] Execute the basic Slack UAT checklist in Bright Builds Slack.
- [x] Record pass/fail results and follow-up risks in the dated UAT artifacts.

## Basic Slack UAT Verification

- [x] Browser-based UAT against `https://brightbuildsllc.slack.com/`
- [x] Update `.codex/tasks/slack-basic-uat-checklist-2026-03-15.md`
- [x] Update `.codex/tasks/slack-uat-2026-03-15.md`

## Basic Slack UAT Completion Review

- The basic Slack flows passed for unscheduled visible polls, anonymous scheduled multi-choice polls, and hidden-results polls, including App Home metadata and details-modal metadata checks.
- The new manager metadata rendered correctly in App Home `Open` and `Closed`, and the details modal showed creator, created time, channel, and closed timing above the option breakdown.
- Residual risk: App Home `Open` stayed stale immediately after a manual close from the channel message until the Home view was refreshed or the filter was toggled, which suggests a refresh/state-sync gap in the manager UI.

## Poll Metadata UI

- [x] Surface creator and distinguishing metadata in App Home summaries.
- [x] Add a matching metadata section to the poll details modal.
- [x] Verify unit, integration, lint, typecheck, and build coverage for the UI change.

## Poll Metadata Verification

- [x] `bun run test`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run build`

## Poll Metadata Completion Review

- App Home now shows creator, created time, target channel, and close timing metadata through a dedicated summary view model instead of rendering directly from raw poll records.
- The poll details modal now includes a metadata section ahead of the per-option voter breakdown, using the same Slack mention and date formatting helpers.
- Added unit coverage for App Home metadata rendering and detail metadata, plus an integration check for an admin managing another user's poll.
- Residual risk: App Home still shows Slack IDs as native mentions, so the final display remains dependent on Slack resolving those mentions in the client.

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
