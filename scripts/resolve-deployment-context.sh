#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[deployment-context] $*" >&2
}

if [[ "${GITHUB_EVENT_NAME}" == "pull_request" ]]; then
  deploy="false"
  environment="preview"
  environment_url=""
elif [[ "${GITHUB_REF_NAME}" == "master" ]]; then
  deploy="true"
  environment="production"
  environment_url="https://0x2c.dev/admin/"
elif [[ "${GITHUB_REF_NAME}" == "develop" ]]; then
  deploy="true"
  environment="development"
  environment_url="https://dev.0x2c.dev/admin/"
else
  deploy="false"
  environment="preview"
  environment_url=""
fi

{
  echo "deploy=${deploy}"
  echo "environment=${environment}"
  echo "environment_url=${environment_url}"
} >> "${GITHUB_OUTPUT}"

log "event=${GITHUB_EVENT_NAME} ref=${GITHUB_REF_NAME} sha=${GITHUB_SHA}"
log "deploy=${deploy} environment=${environment} environment_url=${environment_url:-<none>}"
