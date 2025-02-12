#!/bin/bash

# Configuration
AUTH_TOKEN="123"
ALLOW_DUPLICATES="false"

# Check if analysis file exists
if [ ! -f "$ANALYSIS_FILE" ]; then
    echo "Error: Analysis file not found at $ANALYSIS_FILE"
    exit 1
fi

# Read the JSON file
JSON_DATA=$(cat "$ANALYSIS_FILE")
if [ $? -ne 0 ]; then
    echo "Error: Failed to read analysis file"
    exit 1
fi

# Make the POST request
response=$(curl -s -w "\n%{http_code}" -X POST "${SONG_URL}/submit/demo?allowDuplicates=${ALLOW_DUPLICATES}" \
    -H "accept: */*" \
    -H "Authorization: bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "@${ANALYSIS_FILE}")

# Get status code from response
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Check response
if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
    echo "Success! Status code: $http_code"
    echo "Response body:"
    echo "$body"
else
    echo "Error! Status code: $http_code"
    echo "Error response:"
    echo "$body"
    exit 1
fi