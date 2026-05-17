#!/usr/bin/env bash
set -euo pipefail

image="${1:-zerox2c-blog-admin:test}"
container="${SMOKE_CONTAINER_NAME:-zerox2c-blog-admin-ci}"
path="${SMOKE_PATH:-/admin/}"

log() {
  echo "[smoke-test] $*"
}

cleanup() {
  log "Cleaning up temporary admin container"
  docker rm -f "${container}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "Starting smoke test for image ${image}"
docker run \
  --detach \
  --name "${container}" \
  --publish 127.0.0.1::8080 \
  "${image}" \
  >/dev/null

host_port="$(docker port "${container}" 8080/tcp | sed -E 's/.*:([0-9]+)$/\1/')"
origin="http://127.0.0.1:${host_port}"
url="${origin}${path}"
log "Waiting for admin container at ${url}"

for attempt in {1..30}; do
  log "HTTP check attempt ${attempt}/30"
  if index_html="$(curl --fail --silent --show-error "${url}")"; then
    asset_path="$(printf '%s' "${index_html}" | sed -n 's/.*src="\([^"]*assets[^"]*\.js\)".*/\1/p' | head -n 1)"
    if [[ -n "${asset_path}" ]]; then
      log "Checking built asset ${asset_path}"
      curl --fail --silent --show-error "${origin}${asset_path}" >/dev/null
    fi

    log "Admin container smoke test passed"
    exit 0
  fi

  sleep 1
done

log "Admin container did not respond successfully; dumping logs"
docker logs "${container}"
exit 1
