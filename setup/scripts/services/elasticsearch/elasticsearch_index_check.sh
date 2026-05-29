#!/bin/bash
# /setup/scripts/services/elasticsearch/elasticsearch_index_check.sh
#
# Verifies that every index the deployment expects was actually created and is
# queryable, and that its alias resolves. This complements elasticsearch_check.sh
# (which only confirms cluster-level connectivity/health) the same way the arranger
# healthcheck verifies each catalogue's GraphQL endpoint.
#
# Indices are discovered from the mapping files under ES_INDEX_CONFIG_DIR, following
# the project-wide "<name>" naming convention (see index_discovery.sh) — no numbered
# env vars. Runs AFTER setup_indices.sh, so indices exist but are still empty (data is
# loaded later by conductor-cli); document counts are therefore NOT checked here.
#
# Required environment:
#   ES_URL              Base URL of Elasticsearch, e.g. http://elasticsearch:9200
#   ES_USER, ES_PASS    Credentials
#   ES_INDEX_CONFIG_DIR Path to the mapping config dir, e.g. /configs/elasticsearchConfigs

TIMEOUT=10
ES_INDEX_CONFIG_DIR="${ES_INDEX_CONFIG_DIR:-/configs/elasticsearchConfigs}"

TROUBLESHOOTING_TIPS="
Troubleshooting Tips:
1. Confirm setup_indices.sh ran successfully and reported each index as created
2. Verify the mapping files under ${ES_INDEX_CONFIG_DIR} match the expected '<name>-mapping.json' convention
3. Check Elasticsearch connectivity and credentials (ES_URL, ES_USER, ES_PASS)
4. Inspect existing indices/aliases:  curl -u \$ES_USER:\$ES_PASS \$ES_URL/_cat/indices?v
"

. "$(dirname "$0")/index_discovery.sh"

# Returns the HTTP status code for a GET against the given path.
http_status() {
    curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
        -u "${ES_USER}:${ES_PASS}" "$ES_URL/$1" 2>/dev/null
}

check_indices() {
    if [ ! -d "$ES_INDEX_CONFIG_DIR" ]; then
        printf "   └─ \033[1;31mError:\033[0m Index config directory not found at %s\n" "$ES_INDEX_CONFIG_DIR"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi

    indices=$(discover_indices "$ES_INDEX_CONFIG_DIR")
    if [ -z "$indices" ]; then
        printf "   └─ \033[1;31mError:\033[0m No mapping files (*-mapping.json) found under %s\n" "$ES_INDEX_CONFIG_DIR"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi

    index_total=$(printf '%s\n' "$indices" | grep -c .)
    printf "   └─ \033[1;36mSetup:\033[0m Verifying %d expected index(es)\n" "$index_total"

    all_healthy=true
    OLD_IFS="$IFS"
    IFS='
'
    for line in $indices; do
        index_name=$(printf '%s' "$line" | cut -d'|' -f1)
        alias_name=$(printf '%s' "$line" | cut -d'|' -f3)

        printf "   └─ \033[1;36mChecking index:\033[0m %s (alias %s)\n" "$index_name" "$alias_name"

        index_code=$(http_status "$index_name")
        if [ "$index_code" != "200" ]; then
            printf "   └─ \033[1;31mError:\033[0m Index %s not found (HTTP %s)\n" "$index_name" "$index_code"
            all_healthy=false
            continue
        fi

        alias_code=$(http_status "_alias/$alias_name")
        if [ "$alias_code" != "200" ]; then
            printf "   └─ \033[1;31mError:\033[0m Alias %s does not resolve (HTTP %s)\n" "$alias_name" "$alias_code"
            all_healthy=false
            continue
        fi

        printf "   └─ \033[1;32mSuccess:\033[0m Index %s exists and alias %s resolves\n" "$index_name" "$alias_name"
    done
    IFS="$OLD_IFS"

    if [ "$all_healthy" = true ]; then
        printf "   └─ \033[1;32mSuccess:\033[0m All %d index(es) verified\n" "$index_total"
        exit 0
    else
        printf "   └─ \033[1;31mError:\033[0m One or more expected indices are missing or misconfigured\n"
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        exit 1
    fi
}

check_indices
