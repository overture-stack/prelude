#!/bin/bash
# /setup/scripts/services/arranger/arranger_check.sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=20
TIMEOUT=10

# Tip section - can be updated with specific troubleshooting steps
TROUBLESHOOTING_TIPS="
Troubleshooting Tips:
1. Verify Arranger configuration includes the required 'documentType' property
2. Check if OpenSearch indices are properly configured
3. Review Arranger logs for detailed error messages
4. Ensure environment variables for Arranger are correctly set
"

# Function to parse host and port from URL
parse_url() {
    local url="$1"
    local regex='http://([^:/]+)(:([0-9]+))?'
    if echo "$url" | grep -qE "$regex"; then
        host=$(echo "$url" | sed -E "s|$regex|\1|")
        port=$(echo "$url" | sed -E "s|$regex|\3|" || echo "5050")
    else
        printf "\033[1;31mError:\033[0m Invalid ARRANGER_URL format: %s\n" "$url"
        return 1
    fi
}

# Check if Arranger is properly configured by running a GraphQL query
check_arranger_functionality() {
    local arranger_url="$1"
    local instance="$2"
    
    # Try to get a response from the GraphQL endpoint
    graphql_response=$(curl -s -X POST "${arranger_url}/graphql" \
        -H "Content-Type: application/json" \
        -d '{"query": "{ __schema { queryType { name } } }"}' \
        --max-time "$TIMEOUT" 2>/dev/null)
    
    # Check if we got a valid GraphQL response (no errors)
    if [ -n "$graphql_response" ] && ! echo "$graphql_response" | grep -q "error"; then
        printf "   └─ \033[1;32mSuccess:\033[0m Arranger GraphQL endpoint is functioning correctly\n"
        return 0
    else
        printf "   └─ \033[1;33mWarning:\033[0m Arranger is running but GraphQL endpoint has errors\n"
        
        # Check for the documentType error in Docker logs
        local container_name="arranger-clinical"
        recent_logs=$(docker logs --tail 20 "$container_name" 2>/dev/null)
        
        if echo "$recent_logs" | grep -q "documentType"; then
            printf "\033[1;31mConfiguration Error:\033[0m Missing required 'documentType' property\n"
            printf "Please check Arranger configuration in environment variables or config files\n"
        elif echo "$recent_logs" | grep -q "Error thrown"; then
            error_msg=$(echo "$recent_logs" | grep -A 1 "Error thrown" | grep -v "Error thrown")
            printf "\033[1;31mArranger Error:\033[0m %s\n" "$error_msg"
        fi
        
        return 1
    fi
}

# Check Arranger Docker logs for errors
check_docker_logs() {
    local instance="$1"
    local container_name="arranger-clinical"

    printf "   └─ \033[1;36mInfo:\033[0m Checking Docker logs for errors\n"
    
    # Get recent logs from Docker container
    recent_logs=$(docker logs --tail 50 "$container_name" 2>/dev/null)
    
    # Look for specific error patterns
    if echo "$recent_logs" | grep -q "documentType"; then
        printf "\033[1;31mConfiguration Error:\033[0m Missing required 'documentType' property\n"
        printf "Please check Arranger configuration in environment variables or config files\n"
        return 1
    elif echo "$recent_logs" | grep -q "Error thrown"; then
        error_lines=$(echo "$recent_logs" | grep -n "Error thrown" | cut -d: -f1)
        for line in $error_lines; do
            next_line=$((line + 1))
            error_msg=$(echo "$recent_logs" | sed -n "${next_line}p" | sed 's/^[[:space:]]*//')
            if [ -n "$error_msg" ]; then
                printf "\033[1;31mError in Arranger logs:\033[0m %s\n" "$error_msg"
            fi
        done
        return 1
    fi
    
    return 0
}

# Check Arranger instances based on ARRANGER_COUNT and related environment variables
check_arrangers() {
    # Get the number of Arranger instances to check
    arranger_count=${ARRANGER_COUNT:-0}

    printf "   └─ \033[1;36mSetup:\033[0m Checking %d Arranger instances\n" "$arranger_count"

    all_healthy=true
    i=0
    while [ "$i" -lt "$arranger_count" ]; do
        # Dynamically retrieve the URL for this instance
        arranger_url_var="ARRANGER_${i}_URL"
        arranger_url=$(eval "echo \$$arranger_url_var")

        # Skip if no URL
        if [ -z "$arranger_url" ]; then
            printf "   └─ \033[1;31mError:\033[0m No URL found for Arranger instance %d\n" "$i"
            exit 1
        fi

        # Parse URL
        if ! parse_url "$arranger_url"; then
            exit 1
        fi

        printf "   └─ \033[1;36mChecking Arranger:\033[0m Instance %d at %s\n" "$i" "$arranger_url"

        # Check if Arranger is responsive with multiple retries
        RETRY_COUNT=0
        is_responsive=false

        until [ "$is_responsive" = true ] || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
            response=$(curl -s --max-time "$TIMEOUT" "${arranger_url}" 2>/dev/null)

            if [ -n "$response" ]; then
                is_responsive=true
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                printf "   └─ \033[1;36mInfo:\033[0m Attempt %d: Arranger instance %d not ready, retrying in %d seconds\n" "$RETRY_COUNT" "$i" "$RETRY_DELAY"
                sleep "$RETRY_DELAY"
            fi
        done

        if [ "$is_responsive" = true ]; then
            printf "   └─ \033[1;36mInfo:\033[0m Arranger instance %d is responsive\n" "$i"
            
            # Now check if Arranger is properly functioning
            if ! check_arranger_functionality "$arranger_url" "$i"; then
                all_healthy=false
            fi
            
            # Also check Docker logs for errors
            if ! check_docker_logs "$i"; then
                all_healthy=false
            fi
        else
            printf "   └─ \033[1;31mError:\033[0m Arranger instance %d is not available after %d attempts\n" "$i" "$MAX_RETRIES"
            printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
            all_healthy=false
        fi

        i=$((i + 1))
    done

    if [ "$all_healthy" = true ]; then
        printf "   └─ \033[1;32mSuccess:\033[0m All Arranger instances are available and healthy\n"
        exit 0
    else
        printf "   └─ \033[1;33mWarning:\033[0m Arranger is responding but has configuration issues\n"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi
}

# Run the check
check_arrangers