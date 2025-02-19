#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=15          
TIMEOUT=10              

printf "\033[1;36mConductor:\033[0m Checking if object storage is reachable\n"

until [ "$(curl -s --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$OBJECT_STORAGE_URL/minio/health/live")" = "200" ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\033[1;31mFailed to connect to object storage after %d attempts\033[0m\n" "$MAX_RETRIES"
        exit 1
    fi
    
    printf "\033[1;36mObject Storage:\033[0m Not yet reachable, checking again in %d seconds\n" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Object storage is reachable\n"