#!/usr/bin/env bash
set -Eeuo pipefail

: "${DEPLOY_ENV:?DEPLOY_ENV must be staging or production}"
: "${IMAGE_TAG:?IMAGE_TAG must be the release commit SHA}"

if [[ "$DEPLOY_ENV" != "staging" && "$DEPLOY_ENV" != "production" ]]; then
  echo "DEPLOY_ENV must be staging or production" >&2
  exit 2
fi

deployment_root="${GEARFLOW_DEPLOY_ROOT:-$HOME/gearflow}"
environment_file="$deployment_root/.env"
compose_directory="$deployment_root/infra/deploy"
project_name="gearflow-$DEPLOY_ENV"

if [[ ! -f "$environment_file" ]]; then
  echo "Missing server environment file: $environment_file" >&2
  exit 2
fi

compose=(
  docker compose
  --env-file "$environment_file"
  --project-name "$project_name"
  --file "$compose_directory/compose.release.yml"
)

if [[ "$DEPLOY_ENV" == "staging" ]]; then
  compose+=(--file "$compose_directory/compose.staging.yml")
else
  compose+=(--file "$compose_directory/compose.monitoring.yml")
fi

export IMAGE_TAG

"${compose[@]}" config --quiet
"${compose[@]}" pull
"${compose[@]}" up --detach --remove-orphans

if [[ "$DEPLOY_ENV" == "staging" ]]; then
  "${compose[@]}" --profile seed run --rm seed
fi

web_port=$(sed -n 's/^WEB_PORT=//p' "$environment_file" | tail -n 1)
web_port=${web_port:-8080}
health_url="http://127.0.0.1:${web_port}/api/health"

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error "$health_url" >/dev/null; then
    echo "GearFlow $DEPLOY_ENV is healthy at $health_url"
    exit 0
  fi
  if (( attempt == 30 )); then
    echo "GearFlow $DEPLOY_ENV did not become healthy" >&2
    "${compose[@]}" ps >&2
    "${compose[@]}" logs --no-color --tail=100 api web migrate >&2
    exit 1
  fi
  sleep 5
done
