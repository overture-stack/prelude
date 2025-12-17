#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=5
TIMEOUT=10


printf "   └─ \033[1;36mSetup:\033[0m Checking if Custom UI is reachable\n"

until curl -s -f --max-time "$TIMEOUT" "$CUSTOM_UI_URL" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "   └─ \033[1;31mError:\033[0m Failed to connect to Custom UI after %d attempts\n" "$MAX_RETRIES"
        exit 1
    fi

    printf "   └─ Trying again in %d seconds...\n" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done

printf "   └─ \033[1;32mSuccess:\033[0m Custom UI is now reachable\n"
