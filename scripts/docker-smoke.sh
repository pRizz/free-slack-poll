#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image_tag="free-slack-poll:smoke"
project_name="free-slack-poll-smoke-${RANDOM}"
network_name="${project_name}-network"
db_container="${project_name}-db"
env_file="$(mktemp)"

usage() {
  echo "Usage: $0 <docker|compose>" >&2
}

cleanup() {
  if [[ "${mode}" == "docker" ]]; then
    docker rm -f "${db_container}" >/dev/null 2>&1 || true
    docker network rm "${network_name}" >/dev/null 2>&1 || true
  fi

  if [[ "${mode}" == "compose" ]]; then
    docker compose \
      --project-name "${project_name}" \
      --env-file "${env_file}" \
      down --volumes --remove-orphans >/dev/null 2>&1 || true
  fi

  rm -f "${env_file}"
}

write_env_file() {
  cat <<'EOF' > "${env_file}"
POSTGRES_DB=free_slack_poll
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgres://postgres:postgres@db:5432/free_slack_poll
SLACK_SIGNING_SECRET=smoke-signing-secret
SLACK_BOT_TOKEN=xoxb-smoke-token
SLACK_APP_TOKEN=xapp-smoke-token
POLL_ADMIN_USER_IDS=
DEFAULT_TIMEZONE=UTC
LOG_LEVEL=info
POLL_CLOSE_INTERVAL_SECONDS=30
POLL_SYNC_INTERVAL_SECONDS=15
EOF
}

wait_for_postgres() {
  local attempt

  for attempt in {1..30}; do
    if docker exec "${db_container}" pg_isready -U postgres -d free_slack_poll >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
  done

  echo "Postgres smoke container did not become ready in time." >&2
  return 1
}

run_docker_smoke() {
  docker build -t "${image_tag}" "${repo_root}"
  docker network create "${network_name}" >/dev/null

  docker run -d --rm \
    --name "${db_container}" \
    --network "${network_name}" \
    -e POSTGRES_DB=free_slack_poll \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    postgres:16-alpine >/dev/null

  wait_for_postgres

  docker run --rm \
    --network "${network_name}" \
    -e DATABASE_URL="postgres://postgres:postgres@${db_container}:5432/free_slack_poll" \
    -e SLACK_SIGNING_SECRET=smoke-signing-secret \
    -e SLACK_BOT_TOKEN=xoxb-smoke-token \
    -e SLACK_APP_TOKEN=xapp-smoke-token \
    -e DEFAULT_TIMEZONE=UTC \
    -e LOG_LEVEL=info \
    -e POLL_CLOSE_INTERVAL_SECONDS=30 \
    -e POLL_SYNC_INTERVAL_SECONDS=15 \
    "${image_tag}" node dist/db/migrate.js

  docker run --rm \
    --network "${network_name}" \
    -e DATABASE_URL="postgres://postgres:postgres@${db_container}:5432/free_slack_poll" \
    -e SLACK_SIGNING_SECRET=smoke-signing-secret \
    -e SLACK_BOT_TOKEN=xoxb-smoke-token \
    -e SLACK_APP_TOKEN=xapp-smoke-token \
    -e DEFAULT_TIMEZONE=UTC \
    -e LOG_LEVEL=info \
    -e POLL_CLOSE_INTERVAL_SECONDS=30 \
    -e POLL_SYNC_INTERVAL_SECONDS=15 \
    "${image_tag}" node dist/scripts/preflight.js
}

run_compose_smoke() {
  write_env_file

  docker compose \
    --project-name "${project_name}" \
    --env-file "${env_file}" \
    config >/dev/null

  docker compose \
    --project-name "${project_name}" \
    --env-file "${env_file}" \
    up --build -d db

  docker compose \
    --project-name "${project_name}" \
    --env-file "${env_file}" \
    --profile tools \
    build app migrate

  docker compose \
    --project-name "${project_name}" \
    --env-file "${env_file}" \
    --profile tools \
    run --rm migrate

  docker compose \
    --project-name "${project_name}" \
    --env-file "${env_file}" \
    run --rm app node dist/scripts/preflight.js
}

if [[ "${mode}" != "docker" && "${mode}" != "compose" ]]; then
  usage
  exit 1
fi

trap cleanup EXIT

case "${mode}" in
  docker)
    run_docker_smoke
    ;;
  compose)
    run_compose_smoke
    ;;
esac
