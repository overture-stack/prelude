#!/bin/bash
# /setup/scripts/services/arranger/arranger_check.sh

RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=5
TIMEOUT=10

TROUBLESHOOTING_TIPS="
Troubleshooting Tips:
1. Verify the arranger config directory is mounted and contains base.json with 'documentType' and 'esIndex'
2. Check that the Elasticsearch index exists and the mapping is accessible
3. Review arranger logs for 'Failed...' or 'Error thrown while' messages
4. Ensure ES_HOST, ES_USER, and ES_PASS environment variables are set correctly
5. Confirm the arranger container name matches the hostname in ARRANGER_URL
"

# Extracts host and port from a URL of the form http://hostname:port
parse_url() {
    local url="$1"
    local regex='http://([^:/]+)(:([0-9]+))?'
    if echo "$url" | grep -qE "$regex"; then
        host=$(echo "$url" | sed -E "s|$regex|\1|")
        port=$(echo "$url" | sed -E "s|$regex|\3|")
        port="${port:-5050}"
    else
        printf "\033[1;31mError:\033[0m Invalid ARRANGER_URL format: %s\n" "$url"
        return 1
    fi
}

# Checks the /ping endpoint — arranger's dedicated health route
check_ping() {
    local arranger_url="$1"

    ping_response=$(curl -s --max-time "$TIMEOUT" "${arranger_url}/ping" 2>/dev/null)

    if echo "$ping_response" | grep -qE "functioning correctly|Reporting for duty"; then
        printf "   └─ \033[1;32mSuccess:\033[0m Arranger ping endpoint is healthy\n"
        return 0
    else
        printf "   └─ \033[1;31mError:\033[0m Arranger ping endpoint did not return expected response\n"
        if [ -n "$ping_response" ]; then
            printf "   └─ \033[1;33mResponse:\033[0m %s\n" "$ping_response"
        fi
        return 1
    fi
}

# Validates the GraphQL schema by querying __typename
# Returns success only when arranger's schema built correctly
# Accepts optional second arg to override the graphql path (e.g. /correlation/graphql for multi-catalogue)
check_graphql_schema() {
    local arranger_url="$1"
    local graphql_path="${2:-/graphql}"

    graphql_response=$(curl -s -X POST "${arranger_url}${graphql_path}" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ __typename }"}' \
        --max-time "$TIMEOUT" 2>/dev/null)

    if echo "$graphql_response" | grep -q '"__typename"'; then
        printf "   └─ \033[1;32mSuccess:\033[0m Arranger GraphQL schema is valid\n"
        return 0
    else
        printf "   └─ \033[1;31mError:\033[0m Arranger GraphQL schema is unavailable or invalid\n"
        if [ -n "$graphql_response" ]; then
            printf "   └─ \033[1;33mResponse:\033[0m %s\n" "$graphql_response"
        fi
        return 1
    fi
}

# Scans recent container logs for known arranger error patterns
check_container_logs() {
    local container_name="$1"

    printf "   └─ \033[1;36mInfo:\033[0m Scanning container logs for errors\n"

    recent_logs=$(docker logs --tail 60 "$container_name" 2>/dev/null)

    if echo "$recent_logs" | grep -q "Failed\.\.\."; then
        failed_context=$(echo "$recent_logs" | grep -A 3 "Failed\.\.\." | tail -4)
        printf "   └─ \033[1;31mConfig Error:\033[0m Arranger initialization failed\n"
        printf "%s\n" "$failed_context"
        return 1
    fi

    if echo "$recent_logs" | grep -q "Error thrown while"; then
        error_context=$(echo "$recent_logs" | grep -A 2 "Error thrown while" | tail -3)
        printf "   └─ \033[1;31mInit Error:\033[0m %s\n" "$error_context"
        return 1
    fi

    if echo "$recent_logs" | grep -q "Could not get ES mappings"; then
        printf "   └─ \033[1;31mES Error:\033[0m Could not retrieve Elasticsearch mappings — check index name and ES connectivity\n"
        return 1
    fi

    if echo "$recent_logs" | grep -q "Could not find.*config"; then
        printf "   └─ \033[1;31mConfig Error:\033[0m Config files not found — check volume mount for configs directory\n"
        return 1
    fi

    if echo "$recent_logs" | grep -q "no elasticsearch host"; then
        printf "   └─ \033[1;31mConfig Error:\033[0m ES_HOST environment variable is not set\n"
        return 1
    fi

    printf "   └─ \033[1;32mSuccess:\033[0m No errors detected in container logs\n"
    return 0
}

# Main check loop — iterates over all ARRANGER_${i}_URL instances
check_arrangers() {
    arranger_count=${ARRANGER_COUNT:-0}

    printf "   └─ \033[1;36mSetup:\033[0m Checking %d Arranger instance(s)\n" "$arranger_count"

    all_healthy=true
    i=0
    while [ "$i" -lt "$arranger_count" ]; do
        arranger_url_var="ARRANGER_${i}_URL"
        arranger_url=$(eval "echo \$$arranger_url_var")

        if [ -z "$arranger_url" ]; then
            printf "   └─ \033[1;31mError:\033[0m No URL found for Arranger instance %d\n" "$i"
            exit 1
        fi

        if ! parse_url "$arranger_url"; then
            exit 1
        fi

        # The hostname in the URL is the Docker container name
        container_name="$host"

        printf "   └─ \033[1;36mChecking Arranger:\033[0m Instance %d at %s\n" "$i" "$arranger_url"

        # Step 1: Wait for the ping endpoint to respond
        RETRY_COUNT=0
        is_responsive=false

        until [ "$is_responsive" = true ] || [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
            ping_response=$(curl -s --max-time "$TIMEOUT" "${arranger_url}/ping" 2>/dev/null)

            if echo "$ping_response" | grep -qE "functioning correctly|Reporting for duty"; then
                is_responsive=true
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                printf "   └─ \033[1;36mInfo:\033[0m Attempt %d: Arranger not ready, retrying in %ds\n" "$RETRY_COUNT" "$RETRY_DELAY"
                sleep "$RETRY_DELAY"
            fi
        done

        if [ "$is_responsive" = false ]; then
            printf "   └─ \033[1;31mError:\033[0m Arranger instance %d did not respond after %d attempts\n" "$i" "$MAX_RETRIES"
            check_container_logs "$container_name"
            printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
            all_healthy=false
            i=$((i + 1))
            continue
        fi

        printf "   └─ \033[1;36mInfo:\033[0m Arranger instance %d is responding\n" "$i"

        # Step 2: Validate the GraphQL schema
        # ARRANGER_${i}_GRAPHQL_PATH overrides the default /graphql path (used for multi-catalogue mode)
        graphql_path_var="ARRANGER_${i}_GRAPHQL_PATH"
        graphql_path=$(eval "echo \$$graphql_path_var")
        if ! check_graphql_schema "$arranger_url" "$graphql_path"; then
            check_container_logs "$container_name"
            printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
            all_healthy=false
            i=$((i + 1))
            continue
        fi

        i=$((i + 1))
    done

    if [ "$all_healthy" = true ]; then
        printf "   └─ \033[1;32mSuccess:\033[0m All Arranger instances are healthy\n"
        exit 0
    else
        printf "   └─ \033[1;31mError:\033[0m One or more Arranger instances failed health checks\n"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi
}

check_arrangers
