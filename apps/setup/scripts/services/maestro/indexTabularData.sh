#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              
DEBUG=${DEBUG:-false}

# Array of entity types to process
ENTITY_TYPES="clinical_data"
PAGE_SIZE=20

# Check if environment variables are set
if [ -z "$LYRIC_URL" ]; then
    printf "   └─ \033[1;31mError:\033[0m LYRIC_URL environment variable is not set\n"
    exit 1
fi

if [ -z "$MAESTRO_URL" ]; then
    printf "   └─ \033[1;31mError:\033[0m MAESTRO_URL environment variable is not set\n"
    exit 1
fi

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "   └─ \033[1;33mDEBUG:\033[0m %s\n" "$1"
    fi
}

printf "   └─ \033[1;36mSetup:\033[0m Checking if Data service is healthy\n"

# Function to check Lyric health
check_lyric_health() {
    debug "Checking Lyric health"
    until response=$(curl -s --max-time "$TIMEOUT" "$LYRIC_URL/data/category/1" \
        -H "accept: application/json" 2>/dev/null); do
        RETRY_COUNT=$((RETRY_COUNT + 1))
        
        if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
            printf "   └─ \033[1;31mFailed to connect to Data service after %d attempts\033[0m\n" "$MAX_RETRIES"
            return 1
        fi
        
        printf "   └─ \033[1;36mData service:\033[0m Not yet healthy, checking again in %d seconds\n" "$RETRY_DELAY"
        sleep "$RETRY_DELAY"
    done
    
    if echo "$response" | grep -q '"records":\[' 2>/dev/null; then
        printf "   └─ \033[1;32mSuccess:\033[0m Data service is healthy\n"
        return 0
    else
        printf "   └─ \033[1;31mError:\033[0m Data service returned invalid response\n"
        return 1
    fi
}

# Function to index a single system ID
index_system_id() {
    local system_id=$1
    local entity_type=$2
    RETRY_COUNT=0
    
    debug "   └─ Indexing system ID: $system_id for entity type: $entity_type"
    
    until index_response=$(curl -s -X POST \
        "$MAESTRO_URL/index/repository/lyric.overture/organization/OICR/id/$system_id" \
        -H "accept: application/json" \
        -d '' \
        --max-time "$TIMEOUT" 2>/dev/null); do
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        
        if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
            printf "   └─ \033[1;31mFailed to index system ID %s after %d attempts\033[0m\n" "$system_id" "$MAX_RETRIES"
            return 1
        fi
        
        debug "Retry attempt $RETRY_COUNT for system ID: $system_id"
        printf "   └─ \033[1;36mIndexing:\033[0m Retrying system ID %s, attempt %d\n" "$system_id" "$RETRY_COUNT"
        sleep "$RETRY_DELAY"
    done
    
    if [ -n "$index_response" ]; then
        printf "   └─ \033[1;32mSuccess:\033[0m Indexed %s record with ID %s\n" "$entity_type" "$system_id"
        return 0
    else
        printf "   └─ \033[1;31mError:\033[0m Failed to index %s record with ID %s\n" "$entity_type" "$system_id"
        return 1
    fi
}

# Function to process records for an entity type
process_entity_type() {
    local entity_type=$1
    local page=1
    local has_more=true
    
    debug "Processing entity type: $entity_type"
    
    while [ "$has_more" = true ]; do
        debug "Fetching page $page for entity type: $entity_type"
        
        response=$(curl -s --max-time "$TIMEOUT" \
            "$LYRIC_URL/data/category/1?entityName=$entity_type&page=$page" \
            -H "accept: application/json" 2>/dev/null)
        
        if [ -z "$response" ]; then
            printf "   └─ \033[1;31mError:\033[0m Empty response for %s page %d\n" "$entity_type" "$page"
            return 1
        fi
        
        # Extract and process system IDs
        echo "$response" | grep -o '"systemId":"[^"]*"' | sed 's/"systemId":"//g' | sed 's/"//g' | \
        while read -r system_id; do
            if [ -n "$system_id" ]; then
                index_system_id "$system_id" "$entity_type"
            fi
        done
        
        # Check if there are more pages
        total_pages=$(echo "$response" | grep -o '"totalPages":[0-9]*' | cut -d':' -f2)
        if [ "$page" -ge "$total_pages" ]; then
            has_more=false
        else
            page=$((page + 1))
        fi
    done
}

# Main execution
debug "Starting indexing process"
debug "Environment settings:"
debug "LYRIC_URL: $LYRIC_URL"
debug "MAESTRO_URL: $MAESTRO_URL"
debug "ENTITY_TYPES: $ENTITY_TYPES"

if check_lyric_health; then
    for entity_type in $ENTITY_TYPES; do
        printf "   └─ \033[1;36mProcessing:\033[0m Starting indexing for %s records\n" "$entity_type"
        process_entity_type "$entity_type"
    done
    printf "   └─ \033[1;32mComplete:\033[0m Finished indexing all entity types\n"
else
    exit 1
fi