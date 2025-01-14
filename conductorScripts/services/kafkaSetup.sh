#!/bin/sh

# Quick check if Kafka is ready
until /bin/kafka-topics --bootstrap-server kafka:9092 --list > /dev/null 2>&1; do
  echo -e "\033[1;33mWaiting:\033[0m Kafka not ready yet..."
  sleep 5
done

# Create topic if it doesn't exist
echo -e "\033[1;36mSetting up Kafka:\033[0m Creating Kafka topic for Song"
/bin/kafka-topics --bootstrap-server kafka:9092 --create --if-not-exists \
    --topic song-analysis \
    --partitions 1 \
    --replication-factor 1 \
    --config cleanup.policy=delete \
    --config retention.ms=604800000

# Update healthcheck to just verify
echo "Verifying Kafka topic creation"
/bin/kafka-topics --bootstrap-server kafka:9092 --describe --topic song-analysis
echo -e "\033[1;32mSuccess:\033[0m Kafka Overture Setup Script Complete"
