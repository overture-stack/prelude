#!/bin/sh
# kafka_check.sh
# Polls Kafka from the setup container until the broker is reachable.
# Uses the netcat approach since kafka-topics CLI is not available in alpine/curl.

RETRY_COUNT=0
MAX_RETRIES=20
RETRY_DELAY=15
TIMEOUT=5

printf "\033[1;36mSetup:\033[0m Checking if Kafka is reachable\n"

# Extract host and port from KAFKA_URL env var, or default
KAFKA_HOST="${KAFKA_HOST:-kafka}"
KAFKA_PORT="${KAFKA_PORT:-9092}"

until nc -z -w "$TIMEOUT" "$KAFKA_HOST" "$KAFKA_PORT" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\033[1;31mError:\033[0m Failed to reach Kafka at %s:%s after %d attempts\n" \
            "$KAFKA_HOST" "$KAFKA_PORT" "$MAX_RETRIES"
        exit 1
    fi
    printf "\033[1;36mKafka:\033[0m Not reachable, retrying in %ds (attempt %d/%d)\n" \
        "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Kafka is reachable at %s:%s\n" "$KAFKA_HOST" "$KAFKA_PORT"
