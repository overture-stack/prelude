#!/bin/sh
set -e

echo "=== Data Setup Deployment Starting ==="

# Install curl (needed for health checks)
echo "Installing curl..."
apk add --no-cache curl

# Install conductor CLI
echo "Installing Conductor CLI..."
cd /conductor
npm ci
npm install -g .

# Wait for services to be ready
echo "Waiting for services to be ready..."
timeout=0
until curl -f $LECTERN_URL/health 2>/dev/null || [ $timeout -eq 30 ]; do
  echo "Waiting for Lectern to be ready... ($timeout/30)"
  sleep 2
  timeout=$((timeout + 1))
done

timeout=0
until curl -f $LYRIC_URL/health 2>/dev/null || [ $timeout -eq 30 ]; do
  echo "Waiting for Lyric to be ready... ($timeout/30)"
  sleep 2
  timeout=$((timeout + 1))
done

echo "Services are ready, starting data setup..."

# Upload consolidated dictionary to Lectern
echo "Uploading dictionary to Lectern..."
conductor lecternUpload -s /conductor/configs/lecternDictionaries/lbr-dictionary.json

# Register entities with Lyric schema
echo "Registering entities with Lyric..."
conductor lyricRegister -c idmapping --dict-name lbr-dictionary -v 1.0 -e idmapping
conductor lyricRegister -c sample --dict-name lbr-dictionary -v 1.0 -e sample
conductor lyricRegister -c summary --dict-name lbr-dictionary -v 1.0 -e summary

# Upload tabular data to Lyric
echo "Uploading tabular data to Lyric..."
conductor lyricUpload -d /data/idmapping -c 1 --max-retries 100
conductor lyricUpload -d /data/sample -c 2 --max-retries 100
conductor lyricUpload -d /data/summary -c 3 --max-retries 100

# Index data with Maestro
echo "Indexing data with Maestro..."
conductor maestroIndex --repository-code idmapping
conductor maestroIndex --repository-code sample
conductor maestroIndex --repository-code summary

# Create health check file
echo "Creating health check file..."
touch /health/data_setup_health

echo "=== Data Setup Deployment Completed Successfully ==="