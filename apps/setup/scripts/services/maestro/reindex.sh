#!/bin/bash
# reindex.sh
# Triggers Maestro to re-index all analyses from the song.overture repository.
# Useful after a reset or if documents are missing from the portal search index.
# Maestro must be running with port 11235 accessible on the host.

set -e

MAESTRO_URL="${MAESTRO_URL:-http://localhost:11235}"
ENDPOINT="$MAESTRO_URL/index/repository/song.overture"

if ! curl --silent --fail --output /dev/null "$MAESTRO_URL/actuator/health" 2>/dev/null; then
    printf "\033[1;31mError:\033[0m Maestro is not reachable at %s — is the platform running?\n" "$MAESTRO_URL" >&2
    exit 1
fi

printf "\033[1;36mTriggering Maestro re-index of song.overture repository...\033[0m\n"

RESPONSE=$(curl --silent --show-error --write-out "\n%{http_code}" \
    -X POST "$ENDPOINT" \
    -H 'accept: application/json')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    printf "\033[1;32m✓ Re-index triggered (HTTP %s)\033[0m\n" "$HTTP_CODE"
    printf "  Documents will appear in the portal within a few seconds.\n"
    [ -n "$BODY" ] && printf "  Response: %s\n" "$BODY"
else
    printf "\033[1;31mError:\033[0m Maestro returned HTTP %s\n" "$HTTP_CODE" >&2
    [ -n "$BODY" ] && printf "  Body: %s\n" "$BODY" >&2
    exit 1
fi
