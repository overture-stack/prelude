#!/bin/sh

# Configuration
MAX_RETRIES=10
RETRY_COUNT=0
CSV_PROCESSOR_PATH="/csv-processor"
ES_URL="http://elasticsearch:9200"
DATA_FILE="/data/tabularData.csv"
INDEX_NAME="tabular-index"

# Check if data file exists
if [ ! -f "$DATA_FILE" ]; then
    echo -e "\033[1;31mError:\033[0m Data file not found at $DATA_FILE"
    exit 1
fi

echo -e "\033[1;36mCSV-Processor:\033[0m Setting up elasticsearch ETL utility"

# Install local dependencies first
echo -e "\033[1;35m[1/4]\033[0m Installing local CSV Processor dependencies"

until cd $CSV_PROCESSOR_PATH && npm install --silent 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "\033[1;31mError:\033[0m Failed to install local dependencies after $MAX_RETRIES attempts"
        echo -e "\033[1;31mDebug:\033[0m Installation status:"
        echo "npm version: $(npm -v)"
        echo "Directory contents:"
        ls -la $CSV_PROCESSOR_PATH
        exit 1
    fi
    echo -e "\033[1;36mConductor:\033[0m Local dependencies installation attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in 5 seconds"
    sleep 5
done

# Install CSV Processor globally
echo -e "\033[1;35m[2/4]\033[0m Installing CSV Processor globally"
RETRY_COUNT=0

until npm install -g --silent 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "\033[1;31mError:\033[0m Failed to install CSV Processor globally after $MAX_RETRIES attempts"
        exit 1
    fi
    echo -e "\033[1;36mConductor:\033[0m Global installation attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in 5 seconds"
    sleep 5
done

# Verify installation
echo -e "\033[1;35m[3/4]\033[0m Verifying installation"
if ! command -v csv-processor >/dev/null 2>&1; then
    echo -e "\033[1;31mError:\033[0m CSV Processor installation verification failed"
    echo -e "\033[1;31mDebug:\033[0m Command not found in PATH"
    exit 1
fi
echo -e "\033[1;32mSuccess:\033[0m CSV Processor installed globally"

# Submit data
echo -e "\033[1;35m[4/4]\033[0m Submitting tabular data to Elasticsearch"
if ! csv-processor -f "$DATA_FILE" -i "$INDEX_NAME" --url "$ES_URL"; then
    echo -e "\033[1;31mError:\033[0m Failed to submit data to Elasticsearch"
    exit 1
fi