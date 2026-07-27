#!/bin/bash
# submit.sh
# Runs submit_analyses.sh inside a fresh alpine/curl container on the platform-network
# so all internal service hostnames (song:8080, score:8087, minio:9000) are reachable.

set -e

NETWORK="${COMPOSE_PROJECT_NAME:-overture-demo}_platform-network"

if ! docker network inspect "$NETWORK" > /dev/null 2>&1; then
    printf "\033[1;31mError:\033[0m Docker network '%s' not found — is the platform running?\n" "$NETWORK" >&2
    exit 1
fi

docker run --rm \
    --network "$NETWORK" \
    --platform linux/amd64 \
    -v "$(pwd)/apps/setup:/setup" \
    -v "$(pwd)/data:/data" \
    alpine/curl:8.8.0 \
    sh /setup/scripts/services/song/submit_analyses.sh
