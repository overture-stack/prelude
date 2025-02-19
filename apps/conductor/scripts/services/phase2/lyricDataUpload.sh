#!/bin/sh

# Configuration
CATEGORY_ID=${CATEGORY_ID:-"1"}
ORGANIZATION=${ORGANIZATION:-"OICR"}
MAX_RETRIES=${MAX_RETRIES:-10}
RETRY_DELAY=20
TIMEOUT=10
DEBUG=false

# Configuration for Lectern
LECTERN_URL=${LECTERN_URL:-"http://localhost:3031"}

# Check if environment variables are set
if [ -z "$LYRIC_URL" ]; then
    printf "\033[1;31mError:\033[0m LYRIC_URL environment variable is not set\n"
    exit 1
fi

if [ -z "$LECTERN_URL" ]; then
    printf "\033[1;31mError:\033[0m LECTERN_URL environment variable is not set\n"
    exit 1
fi

if [ ! -d "$LYRIC_DATA" ]; then
    printf "\033[1;31mError:\033[0m Directory not found: %s\n" "$LYRIC_DATA"
    exit 1
fi

# Cache for dictionary and schema info
DICT_ID=""
DICT_NAME=""
SCHEMA_NAME=""

# Function to get and cache dictionary details from Lectern
get_dictionary_info() {
    # Return cached info if available
    if [ -n "$DICT_ID" ] && [ -n "$DICT_NAME" ]; then
        return 0
    fi

    debug "Fetching dictionary information from Lectern..."
    
    # Get dictionary list
    dict_response=$(curl -s -X GET "${LECTERN_URL}/dictionaries" \
        -H 'accept: application/json')
    
    debug "Dictionary response: $dict_response"
    
    # Extract dictionary ID and name using sed
    DICT_ID=$(echo "$dict_response" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p')
    DICT_NAME=$(echo "$dict_response" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')
    
    if [ -z "$DICT_ID" ] || [ -z "$DICT_NAME" ]; then
        printf "\033[1;31mError:\033[0m Could not find dictionary in Lectern\n"
        exit 1
    fi
    
    debug "Found dictionary: $DICT_NAME (ID: $DICT_ID)"
    
    # Get and cache schema name
    schema_response=$(curl -s -X GET "${LECTERN_URL}/dictionaries/${DICT_ID}" \
        -H 'accept: application/json')
    
    debug "Schema response: $schema_response"
    
    # Extract schema name using sed
    SCHEMA_NAME=$(echo "$schema_response" | sed -n 's/.*"schemas":\[{"name":"\([^"]*\)".*/\1/p')
    
    if [ -z "$SCHEMA_NAME" ]; then
        printf "\033[1;31mError:\033[0m Could not find schema name in dictionary\n"
        exit 1
    fi
    
    debug "Found schema name: $SCHEMA_NAME"
}

# Function to get cached schema name
get_valid_schemas() {
    # Get dictionary info if not cached
    get_dictionary_info
    echo "$SCHEMA_NAME"
}

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "\033[1;33mDEBUG:\033[0m %s\n" "$1" >&2
    fi
}

# Change to the data directory
cd "$LYRIC_DATA" || exit 1

# Find all CSV files in the directory
ALL_FILES=$(find . -maxdepth 1 -name "*.csv" -type f -print | sed 's|^./||')

# Check if any CSV files were found
if [ -z "$ALL_FILES" ]; then
    printf "\033[1;31mError:\033[0m No CSV files found in %s\n" "$LYRIC_DATA"
    exit 1
fi

# Function to validate and rename file if needed
validate_and_rename() {
    local file="$1"
    local basename=$(basename "$file" .csv)
    local schema_name=$(get_valid_schemas)
    
    debug "Valid schema name from dictionary: $schema_name"
    
    if echo "$basename" | grep -q "^$schema_name$"; then
        echo "$file"
        return 0
    elif echo "$basename" | grep -q "^$schema_name"; then
        mv "$file" "${schema_name}.csv"
        debug "Renamed $file to ${schema_name}.csv"
        echo "${schema_name}.csv"
        return 0
    fi
    
    printf "\033[1;31mWarning:\033[0m File '$file' does not match schema name.\n" >&2
    printf "Valid schema name (rename your file to this with .csv extension):\n"
    printf "  - %s.csv\n" "$schema_name"
    return 1
}

# Validate and potentially rename files
VALID_FILES=""
for file in $ALL_FILES; do
    validated_file=$(validate_and_rename "$file")
    if [ $? -eq 0 ]; then
        VALID_FILES="$VALID_FILES $validated_file"
    fi
done

# Remove leading space
VALID_FILES=$(echo "$VALID_FILES" | sed 's/^ *//')

# Check if we have any valid files after validation
if [ -z "$VALID_FILES" ]; then
    printf "\033[1;31mError:\033[0m No valid schema-matching files found in %s\n" "$LYRIC_DATA"
    printf "Please rename your files to match the valid schema name:\n"
    printf "  - %s.csv\n" "$(get_valid_schemas)"
    exit 1
fi

# Store validated files in FILES variable
FILES="$VALID_FILES"

# Print found files
debug "Found valid CSV files:"
for file in $FILES; do
    debug "- $file"
done

# Function to check submission status
check_submission() {
    local submission_id=$1
    debug "Checking submission status for ID: $submission_id"
    
    response=$(curl -s -X GET "${LYRIC_URL}/submission/${submission_id}" \
        -H 'accept: application/json')
    
    debug "Submission status response: $response"
    
    if [ $? -eq 0 ]; then
        status=$(echo "$response" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
        printf "Current status: %s\n" "$status"
        
        case $status in
            "VALID")
                return 0
                ;;
            "INVALID")
                printf "\033[1;31mError:\033[0m Submission validation failed\n"
                debug "Response: $response"
                return 1
                ;;
            *)
                return 2
                ;;
        esac
    else
        return 1
    fi
}

# Function to wait for validation
wait_for_validation() {
    local submission_id=$1
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        printf "Checking submission status (attempt %d/%d)...\n" $((retries + 1)) "$MAX_RETRIES"
        
        check_submission "$submission_id"
        result=$?
        
        if [ $result -eq 0 ]; then
            return 0
        elif [ $result -eq 1 ]; then
            return 1
        else
            sleep $RETRY_DELAY
            retries=$((retries + 1))
        fi
    done
    
    printf "\033[1;31mError:\033[0m Validation timed out after %d attempts\n" "$MAX_RETRIES"
    return 1
}

# Function to submit data and get submission ID
submit_data() {
    local curl_cmd="curl -s -X POST '${LYRIC_URL}/submission/category/${CATEGORY_ID}/data' \
        -H 'accept: application/json' \
        -H 'Content-Type: multipart/form-data'"
    
    # Add each found CSV file to the curl command
    for file in $FILES; do
        curl_cmd="${curl_cmd} -F 'files=@${LYRIC_DATA}/${file};type=text/csv'"
    done
    
    # Add organization
    curl_cmd="${curl_cmd} -F 'organization=${ORGANIZATION}'"
    
    debug "Submission curl command: $curl_cmd"
    printf "\033[1;36mSubmitting Data:\033[0m\n"
    printf "API URL: %s\n" "$LYRIC_URL"
    printf "Category ID: %s\n" "$CATEGORY_ID"
    printf "Organization: %s\n" "$ORGANIZATION"
    printf "Data Directory: %s\n" "$LYRIC_DATA"
    printf "Files to submit:\n"
    for file in $FILES; do
        printf "- %s\n" "$file"
    done
    
    # Execute the curl command and store response
    response=$(eval "${curl_cmd}")
    local curl_status=$?
    
    debug "Submit response: $response"
    
    if [ $curl_status -eq 0 ]; then
        # Extract submissionId from response
        SUBMISSION_ID=$(echo "$response" | sed -n 's/.*"submissionId":\([0-9]*\).*/\1/p')
        if [ -n "$SUBMISSION_ID" ] && [ "$SUBMISSION_ID" -gt 0 ] 2>/dev/null; then
            printf "\033[1;32mSuccess:\033[0m Submission ID: %s\n" "$SUBMISSION_ID"
            export SUBMISSION_ID
            return 0
        else
            printf "\033[1;31mError:\033[0m Could not extract submission ID from response\n"
            return 1
        fi
    else
        printf "\033[1;31mError:\033[0m Data submission failed\n"
        return 1
    fi
}

# Function to commit submission
commit_submission() {
    local submission_id=$1
    debug "Committing submission ID: $submission_id"
    
    printf "\033[1;36mCommitting Submission:\033[0m %s\n" "$submission_id"
    
    response=$(curl -s -X POST "${LYRIC_URL}/submission/category/${CATEGORY_ID}/commit/${submission_id}" \
        -H 'accept: application/json' \
        -d '')
    
    debug "Commit response: $response"
    
    if [ $? -eq 0 ]; then
        printf "\033[1;32mSuccess:\033[0m Submission committed\n"
        return 0
    else
        printf "\033[1;31mError:\033[0m Commit request failed\n"
        return 1
    fi
}

# Main execution
printf "\033[1;36mStarting submission process...\033[0m\n"

# Print debug information
debug "Environment settings:"
debug "LYRIC_URL: $LYRIC_URL"
debug "LYRIC_DATA: $LYRIC_DATA"
debug "CATEGORY_ID: $CATEGORY_ID"
debug "ORGANIZATION: $ORGANIZATION"
debug "MAX_RETRIES: $MAX_RETRIES"

# Execute submission process
if submit_data; then
    if wait_for_validation "$SUBMISSION_ID"; then
        commit_submission "$SUBMISSION_ID"
        exit $?
    else
        exit 1
    fi
else
    exit 1
fi