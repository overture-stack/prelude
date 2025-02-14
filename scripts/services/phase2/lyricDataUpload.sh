#!/bin/sh

# Configuration
CATEGORY_ID=${CATEGORY_ID:-"1"}
ORGANIZATION=${ORGANIZATION:-"OICR"}
DATA_DIR=/usr/share/data/tabularData/
MAX_RETRIES=${MAX_RETRIES:-10}
SLEEP_INTERVAL=5

# Check if environment variables are set
if [ -z "$LYRIC_URL" ]; then
    printf "\033[1;31mError:\033[0m LYRIC_URL environment variable is not set\n"
    exit 1
fi

if [ ! -d "$DATA_DIR" ]; then
    printf "\033[1;31mError:\033[0m Directory not found: %s\n" "$DATA_DIR"
    exit 1
fi

# Change to the data directory
cd "$DATA_DIR" || exit 1

# Check if all required files exist
for file in patient.csv diagnosis.csv specimen.csv treatment.csv followup.csv; do
    if [ ! -f "$file" ]; then
        printf "\033[1;31mError:\033[0m Required file not found in %s: %s\n" "$DATA_DIR" "$file"
        exit 1
    fi
done

# Function to check submission status
check_submission() {
    local submission_id=$1
    
    response=$(curl -s -X GET "${LYRIC_URL}/submission/${submission_id}" \
        -H 'accept: application/json')
    
    if [ $? -eq 0 ]; then
        status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        printf "Current status: %s\n" "$status"
        
        case $status in
            "VALID")
                return 0
                ;;
            "INVALID")
                printf "\033[1;31mError:\033[0m Submission validation failed\n"
                printf "Response: %s\n" "$response"
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
            sleep $SLEEP_INTERVAL
            retries=$((retries + 1))
        fi
    done
    
    printf "\033[1;31mError:\033[0m Validation timed out after %d attempts\n" "$MAX_RETRIES"
    return 1
}

# Function to make the data submission
submit_data() {
    local curl_cmd="curl -s -X POST '${LYRIC_URL}/submission/category/${CATEGORY_ID}/data' \
        -H 'accept: application/json' \
        -H 'Content-Type: multipart/form-data'"
    
    # Add each file to the curl command
    for file in patient.csv diagnosis.csv specimen.csv treatment.csv followup.csv; do
        curl_cmd="${curl_cmd} -F 'files=@${DATA_DIR}/${file};type=text/csv'"
    done
    
    # Add organization
    curl_cmd="${curl_cmd} -F 'organization=${ORGANIZATION}'"
    
    printf "\033[1;36mSubmitting Data:\033[0m\n"
    printf "API URL: %s\n" "$LYRIC_URL"
    printf "Category ID: %s\n" "$CATEGORY_ID"
    printf "Organization: %s\n" "$ORGANIZATION"
    printf "Data Directory: %s\n" "$DATA_DIR"
    printf "Files: patient.csv diagnosis.csv specimen.csv treatment.csv followup.csv\n"
    
    # Execute the curl command and store response
    local response
    response=$(eval "${curl_cmd}")
    local curl_status=$?
    
    printf "Response: %s\n" "$response"
    
    if [ $curl_status -eq 0 ]; then
        # Extract submissionId from response using more reliable method
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

# Function to commit the submission
commit_submission() {
    local submission_id=$1
    
    printf "\033[1;36mCommitting Submission:\033[0m %s\n" "$submission_id"
    
    response=$(curl -s -X POST "${LYRIC_URL}/submission/category/${CATEGORY_ID}/commit/${submission_id}" \
        -H 'accept: application/json' \
        -d '')
    
    if [ $? -eq 0 ]; then
        printf "\033[1;32mSuccess:\033[0m Submission committed\n"
        printf "Response: %s\n" "$response"
        return 0
    else
        printf "\033[1;31mError:\033[0m Commit request failed\n"
        printf "Response: %s\n" "$response"
        return 1
    fi
}

# Main execution
printf "\033[1;36mStarting submission process...\033[0m\n"

# Step 1: Submit data and get submission ID
if submit_data; then
    # Step 2: Wait for validation
    if wait_for_validation "$SUBMISSION_ID"; then
        # Step 3: Commit the submission
        commit_submission "$SUBMISSION_ID"
        exit $?
    else
        exit 1
    fi
else
    exit 1
fi