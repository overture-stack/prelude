#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              

printf "   └─ \033[1;36mSetup:\033[0m Checking if Elasticsearch is available\n"

until response=$(curl -s --max-time "$TIMEOUT" -u "${ES_USER}:${ES_PASS}" "${ES_URL}/_cluster/health" -H "accept: */*" 2>/dev/null); do
   RETRY_COUNT=$((RETRY_COUNT + 1))

   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "   └─ \033[1;31mError:\033[0m Failed to connect to Elasticsearch after %d attempts\n" "$MAX_RETRIES"
       exit 1
   fi

   printf "   └─ \033[1;36mElasticsearch:\033[0m Not yet available, checking again in %d seconds\n" "$RETRY_DELAY"
   sleep "$RETRY_DELAY"
done

printf "   └─ \033[1;32mSuccess:\033[0m Elasticsearch is available\n"

# Setting up indices
#
# Indices are discovered from the mapping files under ES_INDEX_CONFIG_DIR, following
# the project-wide "<name>" naming convention (see index_discovery.sh) — so adding
# an index just means dropping a "<name>-mapping.json" file in that directory; no
# numbered ES_INDEX_* env vars to maintain.
ES_INDEX_CONFIG_DIR="${ES_INDEX_CONFIG_DIR:-/configs/elasticsearch}"
. "$(dirname "$0")/index_discovery.sh"

if [ ! -d "$ES_INDEX_CONFIG_DIR" ]; then
    printf "   └─ \033[1;31mError:\033[0m Index config directory not found at %s\n" "$ES_INDEX_CONFIG_DIR"
    exit 1
fi

indices=$(discover_indices "$ES_INDEX_CONFIG_DIR")
if [ -z "$indices" ]; then
    printf "   └─ \033[1;31mError:\033[0m No mapping files (*-mapping.json) found under %s\n" "$ES_INDEX_CONFIG_DIR"
    exit 1
fi

index_total=$(printf '%s\n' "$indices" | grep -c .)
printf "   └─ \033[1;36mElasticsearch:\033[0m Setting up %d indices from %s\n" "$index_total" "$ES_INDEX_CONFIG_DIR"

OLD_IFS="$IFS"
IFS='
'
for line in $indices; do
    index_name=$(printf '%s' "$line" | cut -d'|' -f1)
    template_name=$(printf '%s' "$line" | cut -d'|' -f2)
    alias_name=$(printf '%s' "$line" | cut -d'|' -f3)
    template_file=$(printf '%s' "$line" | cut -d'|' -f4)

    printf "   └─ \033[1;36mSetting up index:\033[0m %s\n" "$index_name"

    if [ ! -f "$template_file" ]; then
        printf "   └─ \033[1;31mError:\033[0m Template file not found at %s\n" "$template_file"
        IFS="$OLD_IFS"
        exit 1
    fi

    if ! curl -s -u "$ES_USER:$ES_PASS" "$ES_URL/_template/$template_name" | grep -q "\"index_patterns\""; then
        curl -s -u "$ES_USER:$ES_PASS" -X PUT "$ES_URL/_template/$template_name" \
            -H "Content-Type: application/json" -d @"$template_file" > /dev/null \
        && printf "   └─ \033[1;36mInfo:\033[0m Created template %s\n" "$template_name"
    else
        printf "   └─ \033[1;36mInfo:\033[0m Template %s already exists, skipping\n" "$template_name"
    fi

    if ! curl -s -f -u "$ES_USER:$ES_PASS" -X GET "$ES_URL/$index_name" > /dev/null 2>&1; then
        curl -s -u "$ES_USER:$ES_PASS" -X PUT "$ES_URL/$index_name" \
            -H "Content-Type: application/json" \
            -d "{\"aliases\": {\"$alias_name\": {}}}" > /dev/null
        printf "   └─ \033[1;36mInfo:\033[0m Created index %s with alias %s\n" "$index_name" "$alias_name"
    else
        printf "   └─ \033[1;36mInfo:\033[0m Index %s already exists\n" "$index_name"
    fi
done
IFS="$OLD_IFS"

printf "   └─ \033[1;32mSuccess:\033[0m Indices set up successfully\n"