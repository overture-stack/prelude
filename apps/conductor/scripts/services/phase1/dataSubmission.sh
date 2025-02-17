#!/bin/sh

# Configuration
CSV_PROCESSOR_PATH="${CSV_PROCESSOR_PATH:-/composer}"
DATA_FILE="${TABULAR_DATA_FILE}"
INDEX_NAME="${TABULAR_INDEX_NAME}"

# Check if data file exists
if [ ! -f "$DATA_FILE" ]; then
    echo -e "\033[1;31mError:\033[0m Data file not found at $DATA_FILE"
    exit 1
fi

echo -e "\033[1;36mComposer:\033[0m Setting up elasticsearch ETL utility"

# Install dependencies and run
echo -e "\033[1;35m[1/2]\033[0m Installing Composer dependencies"
cd $CSV_PROCESSOR_PATH && npm install --silent || {
    echo -e "\033[1;31mError:\033[0m Failed to install dependencies"
    exit 1
}

# Submit data using npx
echo -e "\033[1;35m[2/2]\033[0m Submitting tabular data to Elasticsearch"
npx ts-node src/main.ts -f "$DATA_FILE" -i "$INDEX_NAME" --url "$ES_URL" || {
    echo -e "\033[1;31mError:\033[0m Failed to submit data to Elasticsearch"
    exit 1
}