# Slack Tokens For `free-slack-poll`

Use this reference when Railway bootstrap is blocked on missing Slack credentials.

## Runtime values this repo actually needs

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`

The app code and deployment docs expect exactly those three Slack-side values for runtime.

Important nuance:

- Slack's Socket Mode examples often show only `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`
- this repository currently also validates and passes `SLACK_SIGNING_SECRET`, so bootstrap for this repo should still gather all three values

That distinction comes from the repo's current Bolt setup, not from a claim that every Socket Mode app universally needs the signing secret.

## Recommended approach for this repo

This repository is a private, single-workspace Slack Socket Mode app with a checked-in manifest. The recommended path is:

1. Create or update the Slack app from `manifest/slack.app-manifest.yaml`.
2. Copy the Signing Secret from the app's Basic Information page.
3. Generate an app-level token with the `connections:write` scope for Socket Mode.
4. Install or reinstall the app to the target workspace to generate the bot token.
5. Store those values as Railway service variables for `app`.

Why this is the best fit:

- the manifest already describes the app features, scopes, shortcuts, slash command, and Socket Mode setting used by this repo
- the runtime only needs a bot token plus an app-level token for Socket Mode
- this repo is not currently built around a distributed OAuth install flow across many workspaces

## Exact source for each value

### `SLACK_SIGNING_SECRET`

Get it from:

- Slack app settings
- `Basic Information`
- `App Credentials`
- `Signing Secret`

Use the revealed secret value directly as `SLACK_SIGNING_SECRET`.

### `SLACK_APP_TOKEN`

Get it from:

- Slack app settings
- `Basic Information`
- `App-Level Tokens`
- `Generate Token and Scopes`

Use:

- token type: app-level token
- required scope: `connections:write`

Save the generated `xapp-...` value as `SLACK_APP_TOKEN`.

This repo uses Socket Mode, so the app-level token is required.

### `SLACK_BOT_TOKEN`

Get it from:

- Slack app settings
- `OAuth & Permissions`
- `Install App to Workspace` or `Reinstall App`

After authorizing the installation, copy the `Bot User OAuth Token`, which begins with `xoxb-`, into `SLACK_BOT_TOKEN`.

If scopes in the manifest change, reinstall the app so the bot token reflects the current permissions.

## App creation options

### Recommended: create from the checked-in manifest

Use the Slack UI "from a manifest" flow and paste `manifest/slack.app-manifest.yaml`.

This is the preferred option for this repo because:

- it matches the version-controlled app definition
- it reduces manual drift in scopes and settings
- it keeps Socket Mode and the command/shortcut setup aligned with the codebase

### Acceptable: update an existing app with the manifest

If the user already has an app created for this project, update the existing app's manifest instead of rebuilding everything by hand.

### Not recommended for this repo: create from scratch in the UI

This is slower and more error-prone because the app depends on specific scopes, commands, shortcuts, and Socket Mode settings that already exist in the repo manifest.

### Advanced / usually unnecessary: App Manifest API with config tokens

Slack configuration tokens are for manifest automation, not runtime. They are only needed if the user wants to create or update the app programmatically through Slack's manifest APIs.

Do not ask for a config token during normal Railway bootstrap for this repo.

### Advanced / not recommended for this repo right now: full OAuth install flow

Slack's OAuth installation flow is the right tool when you want users from arbitrary workspaces to install the app themselves or when you need a proper multi-workspace distribution model.

That path adds extra moving parts:

- `client_id`
- `client_secret`
- redirect URL handling
- OAuth code exchange
- installation storage for workspace-specific tokens
- token refresh handling if token rotation is enabled

This repo is currently documented and implemented as a private/internal single-workspace deployment, so that extra OAuth distribution layer is not the recommended starting point.

## Tokens and credentials that are not needed for normal Railway runtime

Do not ask for these unless the user is explicitly changing the architecture:

- user token (`xoxp`): not required for this repo's current runtime
- configuration token (`xoxe...`): only for App Manifest APIs
- client ID / client secret: not needed for the current single-workspace internal deployment flow
- service tokens: Slack says these are for apps created with the Deno Slack SDK, which this repo does not use

## Token rotation guidance

This repo's manifest currently has `token_rotation_enabled: false`.

Recommendation for now:

- keep token rotation off for this app

Reasoning:

- Slack documents that token rotation cannot be turned off once enabled
- rotated access tokens expire every 12 hours
- this repo is not currently set up around a full OAuth installation store / refresh-token workflow

Treat this as a repo-specific recommendation based on the current implementation, not a universal Slack rule.

## Safest way to set secrets on Railway

Prefer one of these:

- set them in the Railway dashboard
- or use `railway variable set --service app --stdin KEY` so the secret value is not placed directly in shell history

Examples:

```bash
printf '%s' 'your-signing-secret' | railway variable set --service app --stdin SLACK_SIGNING_SECRET
printf '%s' 'xoxb-...' | railway variable set --service app --stdin SLACK_BOT_TOKEN
printf '%s' 'xapp-...' | railway variable set --service app --stdin SLACK_APP_TOKEN
```

## Sources

- Slack app manifests: https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests/
- Slack quickstart for app manifest + app token + bot token flow: https://docs.slack.dev/quickstart/
- Slack token types: https://docs.slack.dev/authentication/tokens/
- Slack signing secret / request verification: https://docs.slack.dev/authentication/verifying-requests-from-slack/
- Slack OAuth install flow: https://docs.slack.dev/authentication/installing-with-oauth/
- Slack token rotation: https://docs.slack.dev/authentication/using-token-rotation/
