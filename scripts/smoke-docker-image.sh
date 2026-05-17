#!/usr/bin/env bash
set -euo pipefail

image="${1:-zerox2c-blog-admin:test}"
container_name="zerox2c-blog-admin-ci"
port="18080"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --name "${container_name}" --publish "${port}:8080" "${image}" >/dev/null

for attempt in {1..30}; do
  if curl --fail --silent --show-error "http://127.0.0.1:${port}/admin/" >/dev/null 2>&1; then
    exit 0
  fi

  if [[ "${attempt}" == "30" ]]; then
    docker logs "${container_name}"
    exit 1
  fi

  sleep 1
done
