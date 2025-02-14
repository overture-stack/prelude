#!/bin/sh

# Script uploads analysis files to the SONG service
# Required environment variables:
# - SONG_URL: URL of the SONG service endpoint
# - ANALYSIS_FILE: Path to the analysis file to upload

# Configuration variables
AUTH_TOKEN="123"                # Authentication token for SONG service
ALLOW_DUPLICATES="false"        # Whether to allow duplicate submissions

# Verify required environment variables are set
# -z tests if the variable is empty
if [ -z "$SONG_URL" ] || [ -z "$ANALYSIS_FILE" ]; then
    printf "\033[1;31mError:\033[0m Missing required environment variables\n"
    exit 1
fi

# Check if the analysis file exists
# -f tests if path is a regular file
if [ ! -f "$ANALYSIS_FILE" ]; then
    printf "\033[1;31mError:\033[0m File not found: %s\n" "$ANALYSIS_FILE"
    exit 1
fi

# Submit analysis file to SONG service
# curl options:
#   -s: silent mode
#   -w: write out format (append HTTP status code)
#   -X POST: use POST method
#   -H: add headers
#   -d @file: send file contents as request body
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${SONG_URL}/submit/demo?allowDuplicates=${ALLOW_DUPLICATES}" \
    -H "accept: */*" \
    -H "Authorization: bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @"${ANALYSIS_FILE}")

# Extract HTTP status code from response (last line)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
# Extract response body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check if request was successful (HTTP 200 or 201)
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    ANALYSIS_ID=$(echo "$BODY" | grep -o '"analysisId":"[^"]*"' | cut -d'"' -f4)
    printf "\033[1;32mSuccess:\033[0m Analysis ID: %s\n" "$ANALYSIS_ID"
    exit 0
fi

# Extract error message from JSON response
# grep -o: only show matching part
# cut -d'"' -f4: split on " and take 4th field
ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ERROR_MSG" ]; then
    printf "\033[1;31mError:\033[0m %s\n" "$ERROR_MSG"
fi
exit 1