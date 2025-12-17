#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              
DEBUG=${DEBUG:-false}

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for OpenSearch:
1. Verify OpenSearch service is running
2. Check network connectivity
3. Confirm correct OpenSearch URL and credentials
4. Ensure firewall is not blocking connections
5. Review OpenSearch service logs
6. Check system resource availability
7. Verify authentication credentials
8. Ensure correct OpenSearch version compatibility
"

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "\033[1;33mDEBUG:\033[0m %s\n" "$1"
    fi
}

# Validate OpenSearch URL
if [ -z "$OPENSEARCH_URL" ]; then
    printf "\n\033[1;31mError:\033[0m OPENSEARCH_URL environment variable is not set\n"
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    printf "\n\033[1;33mConfiguration Requirements:\033[0m\n"
    printf "- OPENSEARCH_URL must be set to the base URL of the OpenSearch service\n"
    printf "- Example: export OPENSEARCH_URL=http://opensearch:9200\n"

    exit 1
fi

# Validate URL format
if ! echo "$OPENSEARCH_URL" | grep -qE '^https?://[^/]+'; then
    printf "\n\033[1;31mError:\033[0m Invalid OPENSEARCH_URL format\n"
    printf "\n\033[1;33mURL Format Requirements:\033[0m\n"
    printf "- Must start with http:// or https://\n"
    printf "- Must include hostname\n"
    printf "- Current value: %s\n" "$OPENSEARCH_URL"

    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    exit 1
fi

# Validate credentials (optional if security is disabled)
if [ -n "$OPENSEARCH_USER" ] && [ -n "$OPENSEARCH_PASS" ]; then
    USE_AUTH=true
    debug "Authentication enabled"
else
    USE_AUTH=false
    debug "Authentication disabled (security plugin may be disabled)"
fi

# Clean URL function - removes any double slashes except for http://
clean_url() {
    echo "$1" | sed 's#([^:])//+#\1/#g'
}

# Construct health check URL
HEALTH_URL="$OPENSEARCH_URL/_cluster/health"
HEALTH_URL=$(clean_url "$HEALTH_URL")

debug "Using OPENSEARCH_URL: $OPENSEARCH_URL"
debug "Constructed health URL: $HEALTH_URL"

printf "   └─ \033[1;36mSetup:\033[0m Checking OpenSearch cluster health\n"

# Build curl command based on authentication requirement
until [ -n "$response" ]; do
    if [ "$USE_AUTH" = "true" ]; then
        response=$(curl -s --max-time "$TIMEOUT" -u "${OPENSEARCH_USER}:${OPENSEARCH_PASS}" "$HEALTH_URL" -H "accept: application/json" 2>/dev/null)
        debug "Curl command: curl -s --max-time $TIMEOUT -u ${OPENSEARCH_USER}:${OPENSEARCH_PASS} $HEALTH_URL -H 'accept: application/json'"
    else
        response=$(curl -s --max-time "$TIMEOUT" "$HEALTH_URL" -H "accept: application/json" 2>/dev/null)
        debug "Curl command: curl -s --max-time $TIMEOUT $HEALTH_URL -H 'accept: application/json'"
    fi

    if [ -z "$response" ]; then
        RETRY_COUNT=$((RETRY_COUNT + 1))

        if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
            printf "   └─ \033[1;31mError:\033[0m Failed to connect to OpenSearch after %d attempts\n" "$MAX_RETRIES"

            # Print troubleshooting tips
            printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

            # Additional debug information
            printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
            printf "OpenSearch URL: %s\n" "$OPENSEARCH_URL"
            printf "Health URL: %s\n" "$HEALTH_URL"

            exit 1
        fi

        printf "   └─ \033[1;36mOpenSearch:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
        debug "Attempt $RETRY_COUNT failed. Retrying in $RETRY_DELAY seconds"
        sleep "$RETRY_DELAY"
    fi
done

debug "Received response: $response"

# Check cluster status
cluster_status=$(echo "$response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ "$cluster_status" = "green" ] || [ "$cluster_status" = "yellow" ]; then
    printf "   └─ \033[1;32mSuccess:\033[0m OpenSearch cluster is healthy (Status: %s)\n" "$cluster_status"
else
    printf "   └─ \033[1;31mError:\033[0m OpenSearch cluster has unhealthy status\n"

    # Print troubleshooting tips
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"

    # Additional debug information
    printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
    printf "OpenSearch URL: %s\n" "$OPENSEARCH_URL"
    printf "Health URL: %s\n" "$HEALTH_URL"
    printf "Health Response: %s\n" "$response"

    debug "Cluster status is not green or yellow"
    exit 1
fi