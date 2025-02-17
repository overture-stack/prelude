#!/bin/sh

# Configuration
AUTH_TOKEN="123"

# Check if environment variables are set
if [ -z "$SONG_URL" ]; then
    printf "\033[1;31mError:\033[0m SONG_URL environment variable is not set\n"
    exit 1
fi

if [ -z "$SONG_SCHEMA" ]; then
    printf "\033[1;31mError:\033[0m SONG_SCHEMA environment variable is not set\n"
    exit 1
fi

# Verify schema file exists
if [ ! -f "$SONG_SCHEMA" ]; then
    printf "\033[1;31mError:\033[0m Schema file not found: %s\n" "$SONG_SCHEMA"
    exit 1
fi

# Ensure URL includes /schemas endpoint
if ! echo "$SONG_URL" | grep -q "/schemas$"; then
    SONG_URL="${SONG_URL%/}/schemas"
fi

printf "\033[1;36mUpload:\033[0m Starting schema upload to %s\n" "$SONG_URL"

# Upload schema and capture response
response=$(curl -s -w "\nSTATUS:%{http_code}" -X POST "$SONG_URL" \
    -H "accept: */*" \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$SONG_SCHEMA")

# Extract status code
status_code=$(echo "$response" | grep STATUS: | cut -d: -f2)
# Remove status line from response
response_body=$(echo "$response" | sed '$d')

# Check for errors in both status code and response body
if [ $? -eq 0 ] && [ "$status_code" -eq 200 -o "$status_code" -eq 201 ]; then
    if echo "$response_body" | grep -q "\"error\""; then
        printf "\033[1;31mError:\033[0m %s\n" "$response_body"
        exit 1
    else
        printf "\033[1;32mSuccess:\033[0m %s\n" "$response_body"
        exit 0
    fi
else
    printf "\033[1;31mError:\033[0m Schema upload failed\n"
    printf "Response: %s\n" "$response_body"
    exit 1
fi