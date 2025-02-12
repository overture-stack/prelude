#!/bin/sh

# Configuration
LECTERN_SCHEMA="/usr/share/lecternSchema/lecternSchema.json"
MAX_RETRIES=5
RETRY_DELAY=10

printf "\033[1;36mLectern:\033[0m Uploading schema to %s\n" "$LECTERN_URL"

# Read schema file
if [ ! -f "$LECTERN_SCHEMA" ]; then
    printf "\033[1;31mError:\033[0m Schema file not found: %s\n" "$LECTERN_SCHEMA"
    exit 1
fi

SCHEMA_JSON=$(cat "$LECTERN_SCHEMA")

# Retry loop for uploading schema
RETRY_COUNT=0
until response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$LECTERN_URL" \
    -H "accept: application/json" \
    -H "Content-Type: application/json" \
    -d "$SCHEMA_JSON"); do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\033[1;31mFailed:\033[0m Unable to upload schema after %d attempts\n" "$MAX_RETRIES"
        exit 1
    fi
    
    printf "\033[1;33mRetrying:\033[0m Upload attempt %d failed. Retrying in %d seconds...\n" "$RETRY_COUNT" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done

# Validate response
if [ "$response" -eq 200 ] || [ "$response" -eq 201 ]; then
    printf "\033[1;32mSuccess:\033[0m Schema uploaded successfully\n"
else
    printf "\033[1;31mError:\033[0m Schema upload failed with HTTP status %s\n" "$response"
    exit 1
fi