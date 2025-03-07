#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              
DEBUG=${DEBUG:-false}

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Elasticsearch:
1. Verify Elasticsearch service is running
2. Check network connectivity
3. Confirm correct Elasticsearch URL and credentials
4. Ensure firewall is not blocking connections
5. Review Elasticsearch service logs
6. Check system resource availability
7. Verify authentication credentials
8. Ensure correct Elasticsearch version compatibility
"

# Debug function
debug() {
    if [ "$DEBUG" = "true" ]; then
        printf "\033[1;33mDEBUG:\033[0m %s\n" "$1"
    fi
}

# Validate Elasticsearch URL
if [ -z "$ES_URL" ]; then
    printf "\n\033[1;31mError:\033[0m ES_URL environment variable is not set\n"
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    printf "\n\033[1;33mConfiguration Requirements:\033[0m\n"
    printf "- ES_URL must be set to the base URL of the Elasticsearch service\n"
    printf "- Example: export ES_URL=http://elasticsearch:9200\n"
    
    exit 1
fi

# Validate URL format
if ! echo "$ES_URL" | grep -qE '^https?://[^/]+'; then
    printf "\n\033[1;31mError:\033[0m Invalid ES_URL format\n"
    printf "\n\033[1;33mURL Format Requirements:\033[0m\n"
    printf "- Must start with http:// or https://\n"
    printf "- Must include hostname\n"
    printf "- Current value: %s\n" "$ES_URL"
    
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    exit 1
fi

# Validate credentials
if [ -z "$ES_USER" ] || [ -z "$ES_PASS" ]; then
    printf "\n\033[1;31mError:\033[0m Elasticsearch credentials (ES_USER or ES_PASS) not fully configured\n"
    printf "\n\033[1;33mConfiguration Requirements:\033[0m\n"
    printf "- ES_USER must be set\n"
    printf "- ES_PASS must be set\n"
    
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    exit 1
fi

# Clean URL function - removes any double slashes except for http://
clean_url() {
    echo "$1" | sed 's#([^:])//+#\1/#g'
}

# Construct health check URL
HEALTH_URL="$ES_URL/_cluster/health"
HEALTH_URL=$(clean_url "$HEALTH_URL")

debug "Using ES_URL: $ES_URL"
debug "Constructed health URL: $HEALTH_URL"

printf "\033[1;36mConductor:\033[0m Checking Elasticsearch cluster health\n"

until response=$(curl -s --max-time "$TIMEOUT" -u "${ES_USER}:${ES_PASS}" "$HEALTH_URL" -H "accept: application/json" 2>/dev/null); do
    debug "Curl command: curl -s --max-time $TIMEOUT -u ${ES_USER}:${ES_PASS} $HEALTH_URL -H 'accept: application/json'"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n\033[1;31mError:\033[0m Failed to connect to Elasticsearch after %d attempts\n" "$MAX_RETRIES"
        
        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        
        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Elasticsearch URL: %s\n" "$ES_URL"
        printf "Health URL: %s\n" "$HEALTH_URL"
        
        exit 1
    fi
    
    printf "\033[1;36mElasticsearch:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    debug "Attempt $RETRY_COUNT failed. Retrying in $RETRY_DELAY seconds"
    sleep "$RETRY_DELAY"
done

debug "Received response: $response"

# Check cluster status
cluster_status=$(echo "$response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
if [ "$cluster_status" = "green" ] || [ "$cluster_status" = "yellow" ]; then
    printf "\033[1;32mSuccess:\033[0m Elasticsearch cluster is healthy (Status: %s)\n" "$cluster_status"
else
    printf "\n\033[1;31mError:\033[0m Elasticsearch cluster has unhealthy status\n"
    
    # Print troubleshooting tips
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    
    # Additional debug information
    printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
    printf "Elasticsearch URL: %s\n" "$ES_URL"
    printf "Health URL: %s\n" "$HEALTH_URL"
    printf "Health Response: %s\n" "$response"
    
    debug "Cluster status is not green or yellow"
    exit 1
fi