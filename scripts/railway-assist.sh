#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCRIPT_NAME="$(basename "$0")"

log() {
	printf '[%s] %s\n' "$SCRIPT_NAME" "$*"
}

die() {
	printf '[%s] error: %s\n' "$SCRIPT_NAME" "$*" >&2
	exit 1
}

usage() {
	cat <<'EOF'
Usage:
  ./scripts/railway-assist.sh <command> [options]

Commands:
  doctor
      Check repo prerequisites, Railway CLI installation, authentication, and link status.

  bootstrap [--browserless] [--project <name-or-id>] [--environment <name-or-id>] [--service <name-or-id>]
            [--env-file <path>] [--include-database-url] [--verify <none|fast|full>]
      First-time local CLI bootstrap. Logs in, links the project/environment/service, and can push
      allowed variables from an explicit env file. This does not create GitHub autodeploys or Wait for CI.

  deploy [--service <name-or-id>] [--environment <name-or-id>] [--verify <none|fast|full>]
         [--detach | --ci]
      Run local verification, then deploy the current repo with `railway up`.

  status [--service <name-or-id>] [--environment <name-or-id>] [--all]
      Show the linked Railway project plus service deployment status.

  logs [--service <name-or-id>] [--environment <name-or-id>] [--build | --runtime]
       [--lines <n>] [--since <time>] [--latest]
      Show logs for the linked service. Defaults to latest deployment logs.

  redeploy [--service <name-or-id>] [--environment <name-or-id>]
      Redeploy the latest deployment for the linked service.

  restart [--service <name-or-id>] [--environment <name-or-id>]
      Restart the latest deployment for the linked service.

  vars-push --env-file <path> [--service <name-or-id>] [--environment <name-or-id>]
            [--include-database-url] [--dry-run]
      Push repo-relevant variables from an env file using `railway variable set --skip-deploys`.
      DATABASE_URL is skipped by default to avoid copying a local/dev database URL into Railway.

Examples:
  ./scripts/railway-assist.sh doctor
  ./scripts/railway-assist.sh bootstrap --project free-slack-poll --environment production --service app
  ./scripts/railway-assist.sh vars-push --env-file .env.railway
  ./scripts/railway-assist.sh deploy --verify=full
  ./scripts/railway-assist.sh logs --build --lines 200
EOF
}

install_hint() {
	cat <<'EOF'
Install the Railway CLI with one of these commands:
  brew install railway
  npm install -g @railway/cli
  bun add -g @railway/cli

Docs:
  https://docs.railway.com/develop/cli
EOF
}

require_command() {
	local command_name="$1"

	if ! command -v "$command_name" >/dev/null 2>&1; then
		die "Required command not found: $command_name"
	fi
}

require_railway() {
	if ! command -v railway >/dev/null 2>&1; then
		install_hint >&2
		exit 1
	fi
}

railway_logged_in() {
	railway whoami >/dev/null 2>&1
}

railway_linked() {
	railway status >/dev/null 2>&1
}

railway_service_linked() {
	railway service status >/dev/null 2>&1
}

parse_verify_mode() {
	local maybe_mode="$1"

	case "$maybe_mode" in
	none | fast | full)
		printf '%s\n' "$maybe_mode"
		;;
	*)
		die "Unsupported verify mode: $maybe_mode"
		;;
	esac
}

run_verification() {
	local verify_mode="$1"

	case "$verify_mode" in
	none)
		log "Skipping local verification."
		;;
	fast)
		log "Running fast verification: compose:config + build"
		bun run compose:config
		bun run build
		;;
	full)
		log "Running full verification: compose:config + build + docker:smoke + compose:smoke"
		bun run compose:config
		bun run build
		bun run docker:smoke
		bun run compose:smoke
		;;
	esac
}

ensure_login() {
	local browserless="$1"

	require_railway

	if railway_logged_in; then
		log "Railway CLI is already authenticated."
		railway whoami
		return
	fi

	log "Railway CLI is not authenticated yet."

	if [[ "$browserless" -eq 1 ]]; then
		railway login --browserless
	else
		railway login
	fi
}

show_next_bootstrap_steps() {
	cat <<'EOF'
Next steps outside the CLI helper:
  1. In Railway, provision Postgres if the project does not have it yet.
  2. Set DATABASE_URL to the Railway Postgres connection string.
  3. Connect the GitHub repo in the Railway dashboard and enable Wait for CI on main if you want autodeploys.
  4. Run `./scripts/railway-assist.sh deploy --verify=full` for the first manual deploy.
EOF
}

is_importable_key() {
	local key="$1"
	local include_database_url="$2"

	case "$key" in
	SLACK_SIGNING_SECRET | SLACK_BOT_TOKEN | SLACK_APP_TOKEN | POLL_ADMIN_USER_IDS | DEFAULT_TIMEZONE | LOG_LEVEL | POLL_CLOSE_INTERVAL_SECONDS | POLL_SYNC_INTERVAL_SECONDS)
		return 0
		;;
	DATABASE_URL)
		[[ "$include_database_url" -eq 1 ]]
		return
		;;
	*)
		return 1
		;;
	esac
}

strip_wrapping_quotes() {
	local value="$1"

	if [[ "${#value}" -ge 2 ]]; then
		if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
			printf '%s\n' "${value:1:${#value}-2}"
			return
		fi

		if [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
			printf '%s\n' "${value:1:${#value}-2}"
			return
		fi
	fi

	printf '%s\n' "$value"
}

push_variables_from_env_file() {
	local env_file="$1"
	local include_database_url="$2"
	local dry_run="$3"
	local service="$4"
	local environment="$5"
	local line=""
	local key=""
	local value=""
	local applied_count=0
	local skipped_count=0
	local args=()

	[[ -f "$env_file" ]] || die "Env file does not exist: $env_file"

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	while IFS= read -r line || [[ -n "$line" ]]; do
		line="${line%$'\r'}"

		if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
			continue
		fi

		if [[ ! "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
			die "Unsupported env line in $env_file: $line"
		fi

		key="${line%%=*}"
		value="${line#*=}"
		value="$(strip_wrapping_quotes "$value")"

		if ! is_importable_key "$key" "$include_database_url"; then
			log "Skipping $key from $env_file"
			skipped_count=$((skipped_count + 1))
			continue
		fi

		if [[ "$dry_run" -eq 1 ]]; then
			log "Would set $key"
			applied_count=$((applied_count + 1))
			continue
		fi

		railway variable set "${args[@]}" --skip-deploys "$key=$value"
		applied_count=$((applied_count + 1))
	done <"$env_file"

	log "Variable sync complete. Applied: $applied_count, skipped: $skipped_count"

	if [[ "$include_database_url" -eq 0 ]]; then
		log "DATABASE_URL was intentionally skipped. Set it from Railway Postgres unless you explicitly want to import it."
	fi
}

doctor_command() {
	local railway_version=""

	require_command git
	require_command bun

	log "Repo root: $ROOT_DIR"

	if [[ -f "$ROOT_DIR/railway.json" ]]; then
		log "Found railway.json"
	else
		log "railway.json is missing"
	fi

	if ! command -v railway >/dev/null 2>&1; then
		log "Railway CLI is not installed."
		install_hint
		return 1
	fi

	railway_version="$(railway --version)"
	log "Railway CLI version: $railway_version"

	if railway_logged_in; then
		log "Authenticated as:"
		railway whoami
	else
		log "Railway CLI is not authenticated. Run bootstrap or railway login."
	fi

	if railway_linked; then
		log "Current Railway link:"
		railway status
		log "Current service status:"
		railway service status || true
	else
		log "Current directory is not linked to a Railway project/service yet."
	fi

	cat <<'EOF'
Known runtime variables for this repo:
  Required:
    DATABASE_URL
    SLACK_SIGNING_SECRET
    SLACK_BOT_TOKEN
    SLACK_APP_TOKEN
  Optional:
    POLL_ADMIN_USER_IDS
    DEFAULT_TIMEZONE
    LOG_LEVEL
    POLL_CLOSE_INTERVAL_SECONDS
    POLL_SYNC_INTERVAL_SECONDS
EOF
}

bootstrap_command() {
	local browserless=0
	local project=""
	local environment="production"
	local service=""
	local env_file=""
	local include_database_url=0
	local verify_mode="none"

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--browserless)
			browserless=1
			;;
		--project)
			shift
			project="${1:-}"
			[[ -n "$project" ]] || die "--project requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--env-file)
			shift
			env_file="${1:-}"
			[[ -n "$env_file" ]] || die "--env-file requires a value"
			;;
		--include-database-url)
			include_database_url=1
			;;
		--verify)
			shift
			verify_mode="$(parse_verify_mode "${1:-}")"
			;;
		--verify=*)
			verify_mode="$(parse_verify_mode "${1#*=}")"
			;;
		*)
			die "Unknown bootstrap option: $1"
			;;
		esac
		shift
	done

	run_verification "$verify_mode"
	ensure_login "$browserless"

	if [[ -n "$project" ]]; then
		log "Linking Railway project: $project"
		railway project link "$project"
	elif ! railway_linked; then
		log "No Railway project linked. Starting interactive project link."
		railway project link
	else
		log "Project already linked."
	fi

	if [[ -n "$environment" ]]; then
		log "Linking Railway environment: $environment"
		railway environment link "$environment"
	fi

	if [[ -n "$service" ]]; then
		log "Linking Railway service: $service"
		railway service link "$service"
	elif railway_service_linked; then
		log "Service already linked."
	else
		log "Starting interactive service link."
		railway service link
	fi

	log "Linked Railway target:"
	railway status

	if [[ -n "$env_file" ]]; then
		log "Pushing variables from $env_file"
		push_variables_from_env_file "$env_file" "$include_database_url" 0 "$service" "$environment"
	fi

	show_next_bootstrap_steps
}

deploy_command() {
	local verify_mode="fast"
	local service=""
	local environment=""
	local detach=0
	local ci=0
	local args=(up)

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--verify)
			shift
			verify_mode="$(parse_verify_mode "${1:-}")"
			;;
		--verify=*)
			verify_mode="$(parse_verify_mode "${1#*=}")"
			;;
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		--detach)
			detach=1
			;;
		--ci)
			ci=1
			;;
		*)
			die "Unknown deploy option: $1"
			;;
		esac
		shift
	done

	if [[ "$detach" -eq 1 && "$ci" -eq 1 ]]; then
		die "--detach and --ci cannot be used together"
	fi

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	run_verification "$verify_mode"

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	if [[ "$detach" -eq 1 ]]; then
		args+=(--detach)
	fi

	if [[ "$ci" -eq 1 ]]; then
		args+=(--ci)
	fi

	log "Deploy target:"
	railway status
	log "Running: railway ${args[*]}"
	railway "${args[@]}"

	if [[ "$detach" -eq 1 || "$ci" -eq 1 ]]; then
		log "Follow up with:"
		log "  ./scripts/railway-assist.sh status"
		log "  ./scripts/railway-assist.sh logs --latest"
	fi
}

status_command() {
	local service=""
	local environment=""
	local all=0
	local args=()

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		--all)
			all=1
			;;
		*)
			die "Unknown status option: $1"
			;;
		esac
		shift
	done

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	railway status

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	if [[ "$all" -eq 1 ]]; then
		args+=(--all)
	fi

	railway service status "${args[@]}"
}

logs_command() {
	local service=""
	local environment=""
	local latest=1
	local build=0
	local runtime=0
	local lines=""
	local since_time=""
	local args=(service logs)

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		--latest)
			latest=1
			;;
		--build)
			build=1
			latest=0
			;;
		--runtime)
			runtime=1
			latest=0
			;;
		--lines)
			shift
			lines="${1:-}"
			[[ -n "$lines" ]] || die "--lines requires a value"
			;;
		--since)
			shift
			since_time="${1:-}"
			[[ -n "$since_time" ]] || die "--since requires a value"
			;;
		*)
			die "Unknown logs option: $1"
			;;
		esac
		shift
	done

	if [[ "$build" -eq 1 && "$runtime" -eq 1 ]]; then
		die "--build and --runtime cannot be used together"
	fi

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	if [[ "$build" -eq 1 ]]; then
		args+=(--build)
	elif [[ "$runtime" -eq 0 ]]; then
		args+=(--deployment)
	fi

	if [[ "$latest" -eq 1 ]]; then
		args+=(--latest)
	fi

	if [[ -n "$lines" ]]; then
		args+=(--lines "$lines")
	fi

	if [[ -n "$since_time" ]]; then
		args+=(--since "$since_time")
	fi

	railway "${args[@]}"
}

redeploy_command() {
	local service=""
	local environment=""
	local args=(service redeploy --yes)

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		*)
			die "Unknown redeploy option: $1"
			;;
		esac
		shift
	done

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	railway "${args[@]}"
}

restart_command() {
	local service=""
	local environment=""
	local args=(service restart --yes)

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		*)
			die "Unknown restart option: $1"
			;;
		esac
		shift
	done

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	if [[ -n "$service" ]]; then
		args+=(--service "$service")
	fi

	if [[ -n "$environment" ]]; then
		args+=(--environment "$environment")
	fi

	railway "${args[@]}"
}

vars_push_command() {
	local env_file=""
	local include_database_url=0
	local dry_run=0
	local service=""
	local environment=""

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--env-file)
			shift
			env_file="${1:-}"
			[[ -n "$env_file" ]] || die "--env-file requires a value"
			;;
		--include-database-url)
			include_database_url=1
			;;
		--dry-run)
			dry_run=1
			;;
		--service)
			shift
			service="${1:-}"
			[[ -n "$service" ]] || die "--service requires a value"
			;;
		--environment)
			shift
			environment="${1:-}"
			[[ -n "$environment" ]] || die "--environment requires a value"
			;;
		*)
			die "Unknown vars-push option: $1"
			;;
		esac
		shift
	done

	[[ -n "$env_file" ]] || die "vars-push requires --env-file"

	require_railway
	railway_logged_in || die "Railway CLI is not authenticated. Run bootstrap or railway login first."
	railway_linked || die "This directory is not linked to Railway yet. Run bootstrap first."

	push_variables_from_env_file "$env_file" "$include_database_url" "$dry_run" "$service" "$environment"

	if [[ "$dry_run" -eq 0 ]]; then
		log "Variables were staged with --skip-deploys. Run deploy or redeploy when you want Railway to apply them."
	fi
}

main() {
	local command="${1:-}"

	if [[ -z "$command" ]]; then
		usage
		exit 1
	fi

	shift || true

	case "$command" in
	doctor)
		doctor_command "$@"
		;;
	bootstrap)
		bootstrap_command "$@"
		;;
	deploy)
		deploy_command "$@"
		;;
	status)
		status_command "$@"
		;;
	logs)
		logs_command "$@"
		;;
	redeploy)
		redeploy_command "$@"
		;;
	restart)
		restart_command "$@"
		;;
	vars-push)
		vars_push_command "$@"
		;;
	help | --help | -h)
		usage
		;;
	*)
		die "Unknown command: $command"
		;;
	esac
}

main "$@"
