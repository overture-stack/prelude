#!/bin/sh
set -e

# Ensure required environment variables are set
if [ -z "$TABULAR_SAMPLE_DATA" ] || [ -z "$ES_CONFIG_DIR" ] || [ -z "$TABULAR_INDEX_NAMES" ]; then
    echo "Error: TABULAR_SAMPLE_DATA, ES_CONFIG_DIR, or TABULAR_INDEX_NAMES not set"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$ES_CONFIG_DIR"

# Convert comma-separated list to array
SAMPLE_DATA_ARRAY=$(echo "$TABULAR_SAMPLE_DATA" | tr ',' ' ')
INDEX_NAMES_ARRAY=$(echo "$TABULAR_INDEX_NAMES" | tr ',' ' ')

# Debugging output
echo "TABULAR_SAMPLE_DATA: $TABULAR_SAMPLE_DATA"
echo "TABULAR_INDEX_NAMES: $TABULAR_INDEX_NAMES"
echo "Sample data array: $SAMPLE_DATA_ARRAY"
echo "Index names array: $INDEX_NAMES_ARRAY"

# Set up counters for validation
sample_count=$(echo "$SAMPLE_DATA_ARRAY" | wc -w)
index_count=$(echo "$INDEX_NAMES_ARRAY" | wc -w)

# Validate input arrays
if [ "$sample_count" -ne "$index_count" ]; then
    echo "Error: Number of sample data files must match number of index names"
    exit 1
fi

# Generate mapping for each input file
i=1
for input_file in $SAMPLE_DATA_ARRAY; do
    # Get corresponding index name (uses awk to handle any spaces or unexpected characters)
    index_name=$(echo "$INDEX_NAMES_ARRAY" | awk -v i="$i" '{print $i}' | xargs)  # Trim whitespace from index_name
    
    # Debugging output
    echo "Extracted index name for $input_file: '$index_name'"
    
    if [ -z "$index_name" ]; then
        echo "Error: Empty index name for input file $input_file"
        exit 1
    fi
    
    OUTPUT_FILE="${ES_CONFIG_DIR}/${index_name}-mapping.json"
    
    echo "Generating Elasticsearch mapping for $index_name from $input_file"
    
    # Run the mapping generation command with -f option
    npx composer mapping \
        -f "$input_file" \
        -o "$OUTPUT_FILE" \
        --profile generateElasticSearchMapping \
        --index "$index_name"
    
    # Validate generated mapping
    if [ ! -f "$OUTPUT_FILE" ]; then
        echo "Error: Failed to generate mapping for $index_name"
        exit 1
    fi
    
    i=$((i+1))
done

# List generated mappings
echo "Generated Elasticsearch Mappings:"
find "$ES_CONFIG_DIR" -name "*-mapping.json" -type f | sort
