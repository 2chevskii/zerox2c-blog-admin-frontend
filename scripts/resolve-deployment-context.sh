#!/usr/bin/env bash
set -euo pipefail

{
  if [[ "${GITHUB_EVENT_NAME}" == "pull_request" ]]; then
    echo "deploy=false"
    echo "environment=preview"
    echo "environment_url="
  elif [[ "${GITHUB_REF_NAME}" == "master" ]]; then
    echo "deploy=true"
    echo "environment=production"
    echo "environment_url=https://0x2c.dev/admin/"
  elif [[ "${GITHUB_REF_NAME}" == "develop" ]]; then
    echo "deploy=true"
    echo "environment=development"
    echo "environment_url=https://dev.0x2c.dev/admin/"
  else
    echo "deploy=false"
    echo "environment=preview"
    echo "environment_url="
  fi
} >> "${GITHUB_OUTPUT}"
