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
