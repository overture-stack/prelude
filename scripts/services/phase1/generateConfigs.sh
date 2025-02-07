#!/bin/sh

# Configuration
CSV_PROCESSOR_PATH="${CSV_PROCESSOR_PATH:-/csv-processor}"
DATA_FILE="${TABULAR_DATA_FILE}"
INDEX_NAME="${TABULAR_INDEX_NAME}"
ES_CONFIG_DIR="${ES_CONFIG_DIR:-/es-config}"
ARRANGER_CONFIG_DIR="${ARRANGER_CONFIG_DIR:-/arranger-config}"

# Check if data file exists
if [ ! -f "$DATA_FILE" ]; then
    echo -e "\033[1;31mError:\033[0m Data file not found at $DATA_FILE"
    exit 1
fi

echo -e "\033[1;36mConfig Generator:\033[0m Setting up configuration generator"

# Install dependencies and run
echo -e "\033[1;35m[1/2]\033[0m Installing CSV Processor dependencies"
cd $CSV_PROCESSOR_PATH && npm install --silent || {
    echo -e "\033[1;31mError:\033[0m Failed to install dependencies"
    exit 1
}

# Generate configurations
echo -e "\033[1;35m[2/2]\033[0m Generating Elasticsearch mapping and Arranger configurations"
npx ts-node src/main.ts -m all \
    -f "$DATA_FILE" \
    -i "$INDEX_NAME" \
    -o "${ES_CONFIG_DIR}" \
    --arranger-config-dir "$ARRANGER_CONFIG_DIR" || {
    echo -e "\033[1;31mError:\033[0m Failed to generate configurations"
    exit 1
}

echo -e "\033[1;32mSuccess:\033[0m Configuration files generated:"
echo -e "\033[1;34m  Elasticsearch mapping:\033[0m ${ES_CONFIG_DIR}/mapping.json"
echo -e "\033[1;34m  Arranger configs:\033[0m $ARRANGER_CONFIG_DIR"