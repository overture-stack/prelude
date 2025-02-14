#!/bin/sh

# Configuration
AUTH_TOKEN="bearer123"

# Check if environment variables are set
if [ -z "$LECTERN_URL" ]; then
    printf "\033[1;31mError:\033[0m LECTERN_URL environment variable is not set\n"
    exit 1
fi

# Ensure URL includes /schemas endpoint
if ! echo "$LECTERN_URL" | grep -q "/dictionaries$"; then
    LECTERN_URL="${LECTERN_URL%/}/dictionaries"
fi

printf "\033[1;36mUpload:\033[0m Uploading instrument schema to %s\n" "$LECTERN_URL"

# Read schema file
if [ ! -f "$LECTERN_SCHEMA" ]; then
    printf "\033[1;31mError:\033[0m Schema file not found: %s\n" "$LECTERN_SCHEMA"
    exit 1
fi

# Upload schema and capture both response body and status code
response=$(curl -s -X POST "$LECTERN_URL" \
    -H "accept: */*" \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$LECTERN_SCHEMA")

if [ $? -eq 0 ]; then
    # Check if response contains error
    if echo "$response" | grep -q "\"error\""; then
        printf "\033[1;31mError:\033[0m %s\n" "$response"
        exit 1
    fi
    printf "\033[1;32mSuccess:\033[0m %s\n" "$response"
    exit 0
else
    printf "\033[1;31mError:\033[0m Schema upload failed\n"
    printf "Response: %s\n" "$response"
    exit 1
fi