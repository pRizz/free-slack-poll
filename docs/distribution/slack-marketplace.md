# Slack Distribution And Marketplace Notes

As of 2026-03-15, Slack offers two relevant paths for distributing apps beyond a single internal workspace:

- unlisted public distribution for direct installs
- public listing in the Slack Marketplace

Official docs:

- https://docs.slack.dev/app-management/distribution/
- https://docs.slack.dev/slack-marketplace/distributing-your-app-in-the-slack-marketplace/
- https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide/
- https://docs.slack.dev/apis/events-api/comparing-http-socket-mode/

## Short Answer For This Repo

`free-slack-poll` is **not ready for Slack Marketplace listing as-is**.

The primary blocker is that Slack Marketplace apps must use HTTP delivery rather than Socket Mode, while this repository currently runs in Socket Mode by design.

Repo evidence:

- [manifest/slack.app-manifest.yaml](../../manifest/slack.app-manifest.yaml) enables `socket_mode_enabled: true`
- [README.md](../../README.md) describes the app as private/internal-first
- [README.md](../../README.md) lists Slack Marketplace flows as a non-goal for v1

## What Slack Requires

### Public distribution

Slack supports public distribution outside the Marketplace, but that requires a real OAuth install flow and a publicly reachable HTTPS setup for redirects and user-facing install pages.

### Slack Marketplace

Slack’s published guidance says:

- Marketplace apps must use HTTP, not Socket Mode
- the app must be publicly distributable first
- the app must already be installed on at least 5 active workspaces before submission
- submissions need functional review and supporting listing assets

## Current Gaps In This Repo

These are the practical gaps between the current codebase and a Marketplace-ready app.

### Hard blocker

- Socket Mode is enabled today, which blocks public Marketplace listing

### Distribution-flow gaps

- No public OAuth install flow is implemented in the application code
- No install redirect handling is checked in
- No multi-workspace installation storage is implemented
- No Slack client ID or client secret configuration is present in the checked-in env examples

This is an inference from the current repository state:

- the manifest includes scopes but not an implemented install flow
- `.env.example` includes bot/app/signing tokens, but not Slack OAuth client credentials
- the codebase does not expose install or OAuth callback handlers

### Product and compliance gaps

- no public landing page for installs
- no public support page
- no public privacy-policy page
- no evidence yet of 5 active workspaces using the app

## Realistic Path If Marketplace Distribution Becomes A Goal

1. Keep the current Socket Mode architecture for internal/private installs.
2. Add a separate HTTP-based distribution mode or migrate the app fully to HTTP event delivery.
3. Implement Slack OAuth install and callback handling.
4. Add installation storage for multiple workspaces.
5. Add public-facing install, support, and privacy pages.
6. Pilot the app across at least 5 active workspaces.
7. Submit to Slack Marketplace review.

## Recommendation

For the current product scope, treat this app as:

- self-hostable
- private/internal-workspace installable
- potentially unlisted-distribution-capable in a future OAuth phase

Do not plan on Slack Marketplace submission until the app is intentionally moved off Socket Mode and the multi-workspace OAuth flow is implemented.
