#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=10
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

# Construct health check URL
HEALTH_URL="$ES_URL/_cluster/health"

debug "Using ES_URL: $ES_URL"
debug "Constructed health URL: $HEALTH_URL"

printf "   └─ \033[1;36mSetup:\033[0m Checking Elasticsearch cluster health\n"

# Fails with troubleshooting + debug context, then exits non-zero.
fail() {
    printf "   └─ \033[1;31mError:\033[0m %s\n" "$1"
    printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
    printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
    printf "Elasticsearch URL: %s\n" "$ES_URL"
    printf "Health URL: %s\n" "$HEALTH_URL"
    [ -n "$2" ] && printf "Health Response: %s\n" "$2"
    rm -f "$RESPONSE_FILE"
    exit 1
}

# Single loop that distinguishes the failure modes the old `until curl` masked:
#   - connection failure / timeout (curl exit != 0 or HTTP 000) -> retry
#   - auth failure (401/403)                                    -> fail fast, clear message
#   - other unexpected HTTP code                                -> retry, then fail with the code
#   - HTTP 200 but cluster red                                  -> retry (red is often transient at startup)
#   - HTTP 200 and green/yellow                                 -> success
RESPONSE_FILE="/tmp/es_health_$$.json"
cluster_status=""

while [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; do
    http_code=$(curl -s -o "$RESPONSE_FILE" -w '%{http_code}' --max-time "$TIMEOUT" \
        -u "${ES_USER}:${ES_PASS}" "$HEALTH_URL" -H "accept: application/json" 2>/dev/null)
    curl_exit=$?
    response=$(cat "$RESPONSE_FILE" 2>/dev/null)
    debug "curl_exit=$curl_exit http_code=$http_code response=$response"

    if [ "$curl_exit" -ne 0 ] || [ "$http_code" = "000" ]; then
        reason="not reachable"
    elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        fail "Authentication failed (HTTP $http_code) — check ES_USER and ES_PASS" "$response"
    elif [ "$http_code" != "200" ]; then
        reason="returned HTTP $http_code"
    else
        cluster_status=$(echo "$response" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        if [ "$cluster_status" = "green" ] || [ "$cluster_status" = "yellow" ]; then
            printf "   └─ \033[1;32mSuccess:\033[0m Elasticsearch cluster is healthy (Status: %s)\n" "$cluster_status"
            rm -f "$RESPONSE_FILE"
            exit 0
        fi
        reason="cluster status '${cluster_status:-unknown}'"
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        fail "Elasticsearch not healthy after $MAX_RETRIES attempts ($reason)" "$response"
    fi

    printf "   └─ \033[1;36mElasticsearch:\033[0m %s, retrying in %d seconds (Attempt %d/%d)\n" \
        "$reason" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done