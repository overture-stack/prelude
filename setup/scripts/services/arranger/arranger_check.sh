#!/bin/bash
# /setup/scripts/services/arranger/arranger_check.sh
#
# Multi-catalogue aware Arranger healthcheck.
#
# Catalogues are discovered by scanning the Arranger config directory — the same
# directory the Arranger server itself reads — so adding or removing a catalogue
# requires NO changes here and NO new environment variables: just add or remove
# its config folder under ARRANGER_CONFIG_DIR.
#
# This mirrors the server's own conventions:
#   - Each subdirectory of the config dir is one catalogue
#     (folders named "config"/"configs" are not valid IDs and are skipped).
#   - A catalogue's ID is the "catalogId" field from its JSON if present,
#     otherwise the folder name.
#   - The GraphQL route is "/graphql" when there is exactly one catalogue,
#     and "/<catalogId>/graphql" when there is more than one.
#
# Required environment (set by the setup service in docker-compose):
#   ARRANGER_URL        Base URL of the Arranger server, e.g. http://arranger:5050
#   ARRANGER_CONFIG_DIR Path to the mounted Arranger config dir, e.g. /configs/arrangerConfigs

RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=5
TIMEOUT=10

ARRANGER_URL="${ARRANGER_URL:-http://arranger:5050}"
ARRANGER_CONFIG_DIR="${ARRANGER_CONFIG_DIR:-/configs/arrangerConfigs}"

TROUBLESHOOTING_TIPS="
Troubleshooting Tips:
1. Verify the arranger config directory is mounted and each catalogue folder contains base.json with 'documentType' and 'esIndex'
2. Check that the Elasticsearch index exists and the mapping is accessible
3. Review arranger logs for 'Failed...' or 'Error thrown while' messages
4. Ensure ES_HOST, ES_USER, and ES_PASS environment variables are set correctly
5. Confirm the arranger container name matches the hostname in ARRANGER_URL
6. Confirm ARRANGER_CONFIG_DIR (${ARRANGER_CONFIG_DIR}) points at the same configs the arranger server mounts
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

# Resolves a catalogue's ID the same way the arranger server does:
# a "catalogId" field in any of the folder's JSON files wins; otherwise the
# folder name is used. No jq dependency — kept runnable in the alpine/curl image.
resolve_catalog_id() {
    local dir="$1"
    local folder_name
    folder_name=$(basename "$dir")

    local requested_id
    requested_id=$(grep -hoE '"catalogId"[[:space:]]*:[[:space:]]*"[^"]+"' "$dir"/*.json 2>/dev/null \
        | head -n1 \
        | sed -E 's/.*"catalogId"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')

    if [ -n "$requested_id" ]; then
        echo "$requested_id"
    else
        echo "$folder_name"
    fi
}

# Discovers catalogue IDs by scanning ARRANGER_CONFIG_DIR. Outputs one ID per line.
discover_catalogs() {
    for entry in "$ARRANGER_CONFIG_DIR"/*/; do
        [ -d "$entry" ] || continue

        name=$(basename "$entry")
        case "$name" in
            config | configs) continue ;;
        esac

        # Only consider folders that actually contain JSON config
        ls "$entry"*.json >/dev/null 2>&1 || continue

        resolve_catalog_id "$entry"
    done
}

# Waits for the server-level /ping route to respond. Run once before iterating.
wait_for_ping() {
    local arranger_url="$1"
    RETRY_COUNT=0

    until [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; do
        ping_response=$(curl -s --max-time "$TIMEOUT" "${arranger_url}/ping" 2>/dev/null)

        if echo "$ping_response" | grep -qE "functioning correctly|Reporting for duty"; then
            printf "   └─ \033[1;32mSuccess:\033[0m Arranger ping endpoint is healthy\n"
            return 0
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        printf "   └─ \033[1;36mInfo:\033[0m Attempt %d: Arranger not ready, retrying in %ds\n" "$RETRY_COUNT" "$RETRY_DELAY"
        sleep "$RETRY_DELAY"
    done

    printf "   └─ \033[1;31mError:\033[0m Arranger did not respond on /ping after %d attempts\n" "$MAX_RETRIES"
    return 1
}

# Validates a catalogue's GraphQL schema by querying __typename at the given path.
check_graphql_schema() {
    local arranger_url="$1"
    local graphql_path="$2"

    graphql_response=$(curl -s -X POST "${arranger_url}${graphql_path}" \
        -H "Content-Type: application/json" \
        -d '{"query":"{ __typename }"}' \
        --max-time "$TIMEOUT" 2>/dev/null)

    if echo "$graphql_response" | grep -q '"__typename"'; then
        printf "   └─ \033[1;32mSuccess:\033[0m GraphQL schema valid at %s\n" "$graphql_path"
        return 0
    else
        printf "   └─ \033[1;31mError:\033[0m GraphQL schema unavailable or invalid at %s\n" "$graphql_path"
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

# Main check: discover catalogues from the config dir, then validate each.
check_arrangers() {
    if [ ! -d "$ARRANGER_CONFIG_DIR" ]; then
        printf "   └─ \033[1;31mError:\033[0m Arranger config directory not found at %s\n" "$ARRANGER_CONFIG_DIR"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi

    # Discover catalogues from subdirectories; fall back to a flat single-catalogue config.
    catalog_ids=$(discover_catalogs)
    if [ -z "$catalog_ids" ] && ls "$ARRANGER_CONFIG_DIR"/*.json >/dev/null 2>&1; then
        catalog_ids=$(resolve_catalog_id "$ARRANGER_CONFIG_DIR")
    fi

    if [ -z "$catalog_ids" ]; then
        printf "   └─ \033[1;31mError:\033[0m No catalogue configs found under %s\n" "$ARRANGER_CONFIG_DIR"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi

    catalog_count=$(printf '%s\n' "$catalog_ids" | grep -c .)
    printf "   └─ \033[1;36mSetup:\033[0m Discovered %d catalogue(s) at %s: %s\n" \
        "$catalog_count" "$ARRANGER_CONFIG_DIR" "$(printf '%s' "$catalog_ids" | tr '\n' ' ')"

    if ! parse_url "$ARRANGER_URL"; then
        exit 1
    fi
    # The hostname in the URL is the Docker container name
    container_name="$host"

    # Step 1: wait once for the server-level ping endpoint
    if ! wait_for_ping "$ARRANGER_URL"; then
        check_container_logs "$container_name"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi

    # Step 2: validate each catalogue's GraphQL schema.
    # Path scheme matches the server: single catalogue -> /graphql, multiple -> /<id>/graphql.
    # Iterate with a for-loop over IFS=newline (not a piped while) so it does not run in
    # a subshell — that way all_healthy=false propagates out of the loop in POSIX sh.
    all_healthy=true
    OLD_IFS="$IFS"
    IFS='
'
    for catalog_id in $catalog_ids; do
        [ -n "$catalog_id" ] || continue

        if [ "$catalog_count" -gt 1 ]; then
            graphql_path="/${catalog_id}/graphql"
        else
            graphql_path="/graphql"
        fi

        printf "   └─ \033[1;36mChecking catalogue:\033[0m %s (%s)\n" "$catalog_id" "$graphql_path"

        if ! check_graphql_schema "$ARRANGER_URL" "$graphql_path"; then
            check_container_logs "$container_name"
            all_healthy=false
        fi
    done
    IFS="$OLD_IFS"

    if [ "$all_healthy" = true ]; then
        printf "   └─ \033[1;32mSuccess:\033[0m All %d catalogue(s) are healthy\n" "$catalog_count"
        exit 0
    else
        printf "   └─ \033[1;31mError:\033[0m One or more catalogues failed health checks\n"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi
}

check_arrangers
