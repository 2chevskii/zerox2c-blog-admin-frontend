#!/usr/bin/env bash
set -euo pipefail

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

VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/0x2c-blog}"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-${DEFAULT_APP_PORT}}"

ssh_dir="$(mktemp -d)"
payload_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${ssh_dir}" "${payload_dir}"
}
trap cleanup EXIT

key_path="${ssh_dir}/deploy_key"
known_hosts_path="${ssh_dir}/known_hosts"

printf '%s\n' "${VPS_SSH_PRIVATE_KEY}" > "${key_path}"
chmod 600 "${key_path}"
ssh-keyscan -p "${VPS_SSH_PORT}" "${VPS_HOST}" > "${known_hosts_path}"

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
ssh_options=(
  -i "${key_path}"
  -p "${VPS_SSH_PORT}"
  -o "UserKnownHostsFile=${known_hosts_path}"
)

ssh "${ssh_options[@]}" "${target}" "mkdir -p '${deploy_dir}'"
scp \
  -i "${key_path}" \
  -P "${VPS_SSH_PORT}" \
  -o "UserKnownHostsFile=${known_hosts_path}" \
  "${payload_dir}/compose.yaml" \
  "${target}:${deploy_dir}/"

ssh "${ssh_options[@]}" "${target}" "cd '${deploy_dir}' && docker compose pull && docker compose up -d --remove-orphans"

for attempt in {1..30}; do
  if ssh "${ssh_options[@]}" "${target}" "curl --fail --silent --show-error 'http://${APP_HOST}:${APP_PORT}/admin/' >/dev/null"; then
    exit 0
  fi

  sleep 1
done

ssh "${ssh_options[@]}" "${target}" "cd '${deploy_dir}' && docker compose logs admin --tail=120"
exit 1
