#!/bin/sh

# Configuration
SCHEMA_FILE="/usr/share/instrumentSchema/instrumentSchema.json"
MAX_RETRIES=5
RETRY_DELAY=10
API_URL="http://localhost:8080/schemas"
AUTH_TOKEN="bearer123"

# Check if environment variables are set
if [ -z "$API_URL" ]; then
    printf "\033[1;31mError:\033[0m API_URL environment variable is not set\n"
    exit 1
fi

printf "\033[1;36mUpload:\033[0m Uploading instrument schema to %s\n" "$API_URL"

# Read schema file
if [ ! -f "$SCHEMA_FILE" ]; then
    printf "\033[1;31mError:\033[0m Schema file not found: %s\n" "$SCHEMA_FILE"
    exit 1
fi

# Retry loop for uploading schema
RETRY_COUNT=0
until response=$(curl -s -w "%{http_code}" -X POST "$API_URL" \
    -H "accept: */*" \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$SCHEMA_FILE"); do
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