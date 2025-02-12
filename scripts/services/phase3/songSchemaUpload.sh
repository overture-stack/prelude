#!/bin/sh

# Configuration
MAX_RETRIES=5
RETRY_DELAY=10
AUTH_TOKEN="123"

# Print colored messages
log() {
    COLOR=$1; MSG=$2; shift 2
    printf "\033[${COLOR}m${MSG}\033[0m\n" "$@"
}

# Check required environment variables
for VAR in SONG_URL SONG_SCHEMA; do
    if [ -z "$(eval echo \$$VAR)" ]; then
        log "1;31" "Error: $VAR environment variable is not set"
        exit 1
    fi
done

# Verify schema file exists
if [ ! -f "$SONG_SCHEMA" ]; then
    log "1;31" "Error: Schema file not found: %s" "$SONG_SCHEMA"
    exit 1
fi

# Upload schema with retries
log "1;36" "Upload: Starting schema upload to %s/schemas" "$SONG_URL"

for ATTEMPT in $(seq 1 $MAX_RETRIES); do
    RESPONSE=$(curl -s -w "\nHTTPSTATUS:%{http_code}" -X POST "$SONG_URL/schemas" \
        -H "accept: */*" \
        -H "Authorization: $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d @"$SONG_SCHEMA")
    
    HTTP_STATUS=$(echo "$RESPONSE" | grep HTTPSTATUS | cut -d: -f2)
    
    if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
        log "1;32" "Success: Schema uploaded successfully"
        exit 0
    fi
    
    if [ "$ATTEMPT" -lt "$MAX_RETRIES" ]; then
        log "1;33" "Retrying: Attempt %d of %d. Waiting %d seconds..." "$ATTEMPT" "$MAX_RETRIES" "$RETRY_DELAY"
        sleep "$RETRY_DELAY"
    fi
done

log "1;31" "Error: Schema upload failed after %d attempts" "$MAX_RETRIES"
exit 1