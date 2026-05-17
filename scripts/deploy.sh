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
log "Validated required environment variables"

VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/0x2c-blog}"
DIST_DIR="${DIST_DIR:-dist}"
log "Resolved deployment configuration: environment=${DEPLOY_ENVIRONMENT}, dist_dir=${DIST_DIR}"
log "Resolved VPS target: ${VPS_SSH_USER}@${VPS_HOST}:${VPS_SSH_PORT}"
log "Resolved deploy root: ${DEPLOY_ROOT}"

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "Missing ${DIST_DIR}/index.html. Build or download the frontend artifact before deploying." >&2
  exit 1
fi
log "Found static artifact entrypoint ${DIST_DIR}/index.html"

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

log "Creating admin static archive"
tar -czf "${payload_dir}/admin-static.tar.gz" -C "${DIST_DIR}" .
archive_size="$(du -h "${payload_dir}/admin-static.tar.gz" | awk '{print $1}')"
log "Created admin-static.tar.gz (${archive_size})"

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
log "Uploading admin static archive"
scp \
  -i "${key_path}" \
  -P "${VPS_SSH_PORT}" \
  -o "UserKnownHostsFile=${known_hosts_path}" \
  "${payload_dir}/admin-static.tar.gz" \
  "${target}:${deploy_dir}/"

log "Publishing admin static files atomically"
ssh "${ssh_options[@]}" "${target}" "cd '${deploy_dir}' && rm -rf www.next && mkdir -p www.next && tar -xzf admin-static.tar.gz -C www.next && rm -rf www.previous && if [ -d www ]; then mv www www.previous; fi && mv www.next www && rm -f admin-static.tar.gz && test -f www/index.html"
log "Admin deployment completed successfully"
