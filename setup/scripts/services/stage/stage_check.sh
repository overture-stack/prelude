#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=5
TIMEOUT=10


printf "\033[1;36mSetup:\033[0m Checking if Stage is reachable\n"

until curl -s -f --max-time "$TIMEOUT" "$STAGE_URL" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\033[1;31mFailed to connect to Stage after %d attempts\033[0m\n" "$MAX_RETRIES"
        exit 1
    fi

    printf "Trying again in %d seconds...\n" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Stage is now reachable\n"