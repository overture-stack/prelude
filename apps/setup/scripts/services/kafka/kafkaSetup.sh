#!/bin/sh
# kafkaSetup.sh
# Runs inside the Kafka container at startup (before the broker is fully ready).
# Waits until Kafka accepts connections, then creates the required topics.

BOOTSTRAP=kafka:9092
MAX_RETRIES=30
RETRY_DELAY=5

echo "Kafka: waiting for broker to be ready..."
i=0
until /bin/kafka-topics --bootstrap-server "$BOOTSTRAP" --list > /dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$MAX_RETRIES" ]; then
        echo "Kafka: broker not ready after $MAX_RETRIES attempts — giving up"
        exit 1
    fi
    echo "Kafka: not ready yet, retrying in ${RETRY_DELAY}s (attempt $i/$MAX_RETRIES)"
    sleep "$RETRY_DELAY"
done

echo "Kafka: broker ready — creating topics"

create_topic() {
    topic="$1"
    if /bin/kafka-topics --bootstrap-server "$BOOTSTRAP" --list | grep -q "^${topic}$"; then
        echo "Kafka: topic '$topic' already exists, skipping"
    else
        /bin/kafka-topics --bootstrap-server "$BOOTSTRAP" \
            --create \
            --topic "$topic" \
            --partitions 1 \
            --replication-factor 1
        echo "Kafka: created topic '$topic'"
    fi
}

create_topic "song-analysis"
create_topic "maestro_index_requests"
create_topic "maestro_song_analysis_dlq"
create_topic "maestro_index_requests_dlq"

echo "Kafka: topic setup complete"
