#!/usr/bin/env bash
# Holt den neuesten Stand von GitHub und startet Yomakr neu. Die Daten bleiben erhalten.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f
