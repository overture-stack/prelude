#!/bin/sh
set -e

# Ensure required environment variables are set
if [ -z "$ES_CONFIG_DIR" ] || [ -z "$ARRANGER_CONFIG_DIR" ]; then
    echo "Error: ES_CONFIG_DIR or ARRANGER_CONFIG_DIR not set"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$ARRANGER_CONFIG_DIR"

# Find all Elasticsearch mapping files
MAPPING_FILES=$(find "$ES_CONFIG_DIR" -name "*-mapping.json" | sort)

# Check if mapping files exist
if [ -z "$MAPPING_FILES" ]; then
    echo "Error: No Elasticsearch mapping files found in $ES_CONFIG_DIR"
    exit 1
fi

# Generate Arranger configs for each mapping file
for MAPPING_FILE in $MAPPING_FILES; do
    # Extract index name from mapping filename
    INDEX_NAME=$(basename "$MAPPING_FILE" -mapping.json)
    
    # Define output directory for this index
    INDEX_OUTPUT_DIR="${ARRANGER_CONFIG_DIR}/${INDEX_NAME}"
    mkdir -p "$INDEX_OUTPUT_DIR"
    
    echo "Generating Arranger configs for $INDEX_NAME from $MAPPING_FILE"
    
    # Run the Arranger config generation command
    npx composer arranger \
        -f "$MAPPING_FILE" \
        --output "$INDEX_OUTPUT_DIR" \
        --profile generateArrangerConfigs \
        --index "$INDEX_NAME"
    
    # Validate generated configs
    EXPECTED_CONFIGS="base.json extended.json table.json facets.json"
    for CONFIG in $EXPECTED_CONFIGS; do
        if [ ! -f "${INDEX_OUTPUT_DIR}/${CONFIG}" ]; then
            echo "Error: Failed to generate $CONFIG for $INDEX_NAME"
            exit 1
        fi
    done
done

# List generated Arranger configs
echo "Generated Arranger Configurations:"
find "$ARRANGER_CONFIG_DIR" -name "*.json" -type f | sort
