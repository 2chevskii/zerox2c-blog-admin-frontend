#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[deploy-admin] $*"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing ${name} environment secret" >&2
    exit 1
  fi
}

require_env VPS_HOST
require_env VPS_SSH_USER
require_env VPS_SSH_PRIVATE_KEY
require_env DEPLOY_ENVIRONMENT
require_env IMAGE
require_env DEFAULT_APP_PORT
log "Validated required environment variables"

VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/0x2c-blog}"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-${DEFAULT_APP_PORT}}"
if [[ "${APP_HOST}" == "0.0.0.0" ]]; then
  HEALTH_CHECK_HOST="${HEALTH_CHECK_HOST:-127.0.0.1}"
else
  HEALTH_CHECK_HOST="${HEALTH_CHECK_HOST:-${APP_HOST}}"
fi
log "Resolved deployment configuration: environment=${DEPLOY_ENVIRONMENT}, image=${IMAGE}"
log "Resolved VPS target: ${VPS_SSH_USER}@${VPS_HOST}:${VPS_SSH_PORT}"
log "Resolved deploy root: ${DEPLOY_ROOT}"
log "Resolved admin binding: ${APP_HOST}:${APP_PORT}->8080"
log "Resolved admin health check: http://${HEALTH_CHECK_HOST}:${APP_PORT}/admin/"

ssh_dir="$(mktemp -d)"
payload_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${ssh_dir}" "${payload_dir}"
}
trap cleanup EXIT

key_path="${ssh_dir}/deploy_key"
known_hosts_path="${ssh_dir}/known_hosts"

log "Preparing temporary SSH material"
printf '%s\n' "${VPS_SSH_PRIVATE_KEY}" > "${key_path}"
chmod 600 "${key_path}"
log "Scanning SSH host key"
ssh-keyscan -p "${VPS_SSH_PORT}" "${VPS_HOST}" > "${known_hosts_path}"

log "Generating Docker Compose payload"
cat > "${payload_dir}/compose.yaml" <<COMPOSE
services:
  admin:
    image: ${IMAGE}
    restart: unless-stopped
    ports:
      - "${APP_HOST}:${APP_PORT}:8080"
COMPOSE

target="${VPS_SSH_USER}@${VPS_HOST}"
deploy_dir="${DEPLOY_ROOT}/${DEPLOY_ENVIRONMENT}/admin"
log "Remote deployment directory: ${deploy_dir}"
ssh_options=(
  -i "${key_path}"
  -p "${VPS_SSH_PORT}"
  -o "UserKnownHostsFile=${known_hosts_path}"
)

log "Ensuring remote deployment directory exists"
ssh "${ssh_options[@]}" "${target}" "mkdir -p '${deploy_dir}'"
log "Uploading compose.yaml"
scp \
  -i "${key_path}" \
  -P "${VPS_SSH_PORT}" \
  -o "UserKnownHostsFile=${known_hosts_path}" \
  "${payload_dir}/compose.yaml" \
  "${target}:${deploy_dir}/"

log "Pulling image and updating admin container"
ssh "${ssh_options[@]}" "${target}" "cd '${deploy_dir}' && docker compose pull && docker compose up -d --remove-orphans"

log "Checking admin container through host binding"
for attempt in {1..30}; do
  log "Health check attempt ${attempt}/30"
  if ssh "${ssh_options[@]}" "${target}" "curl --fail --silent --show-error 'http://${HEALTH_CHECK_HOST}:${APP_PORT}/admin/' >/dev/null"; then
    log "Admin deployment completed successfully"
    exit 0
  fi

  sleep 2
done

log "Health check failed; dumping recent admin logs"
ssh "${ssh_options[@]}" "${target}" "cd '${deploy_dir}' && docker compose logs admin --tail=120"
exit 1
