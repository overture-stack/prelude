#!/bin/bash

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10
RETRY_DELAY=20
TIMEOUT=10

# Check if authentication is needed
if [ -n "$OPENSEARCH_USER" ] && [ -n "$OPENSEARCH_PASS" ]; then
    USE_AUTH=true
    AUTH_FLAG="-u ${OPENSEARCH_USER}:${OPENSEARCH_PASS}"
else
    USE_AUTH=false
    AUTH_FLAG=""
fi

printf "   └─ \033[1;36mSetup:\033[0m Checking if OpenSearch is available\n"

until response=$(curl -s --max-time "$TIMEOUT" $AUTH_FLAG "${OPENSEARCH_URL}/_cluster/health" -H "accept: */*" 2>/dev/null); do
   RETRY_COUNT=$((RETRY_COUNT + 1))

   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "   └─ \033[1;31mError:\033[0m Failed to connect to OpenSearch after %d attempts\n" "$MAX_RETRIES"
       exit 1
   fi

   printf "   └─ \033[1;36mOpenSearch:\033[0m Not yet available, checking again in %d seconds\n" "$RETRY_DELAY"
   sleep "$RETRY_DELAY"
done

printf "   └─ \033[1;32mSuccess:\033[0m OpenSearch is available\n"

# Setting up indices
INDEX_COUNT=${OPENSEARCH_INDEX_COUNT:-0}
printf "   └─ \033[1;36mOpenSearch:\033[0m Setting up %d indices\n" "$INDEX_COUNT"

i=0
while [ "$i" -lt "$INDEX_COUNT" ]; do
    # Use indirect variable expansion with proper syntax
    index_name_var="OPENSEARCH_INDEX_${i}_NAME"
    template_file_var="OPENSEARCH_INDEX_${i}_TEMPLATE_FILE"
    template_name_var="OPENSEARCH_INDEX_${i}_TEMPLATE_NAME"
    alias_name_var="OPENSEARCH_INDEX_${i}_ALIAS_NAME"

    index_name=$(eval "echo \$$index_name_var")
    template_file=$(eval "echo \$$template_file_var")
    template_name=$(eval "echo \$$template_name_var")
    alias_name=$(eval "echo \$$alias_name_var")

    if [ -z "$index_name" ]; then
        i=$((i + 1))
        continue
    fi

    printf "   └─ \033[1;36mSetting up index:\033[0m %s\n" "$index_name"

    if [ ! -f "$template_file" ]; then
        printf "   └─ \033[1;31mError:\033[0m Template file not found at %s\n" "$template_file"
        exit 1
    fi

    if ! curl -s $AUTH_FLAG "$OPENSEARCH_URL/_template/$template_name" | grep -q "\"index_patterns\""; then
        curl -s $AUTH_FLAG -X PUT "$OPENSEARCH_URL/_template/$template_name" \
            -H "Content-Type: application/json" -d @"$template_file" > /dev/null \
        && printf "   └─ \033[1;36mInfo:\033[0m Created template %s\n" "$template_name"
    else
        printf "   └─ \033[1;36mInfo:\033[0m Template %s already exists, skipping\n" "$template_name"
    fi

    if ! curl -s -f $AUTH_FLAG -X GET "$OPENSEARCH_URL/$index_name" > /dev/null 2>&1; then
        curl -s $AUTH_FLAG -X PUT "$OPENSEARCH_URL/$index_name" \
            -H "Content-Type: application/json" \
            -d "{\"aliases\": {\"$alias_name\": {}}}" > /dev/null
        printf "   └─ \033[1;36mInfo:\033[0m Created index %s with alias %s\n" "$index_name" "$alias_name"
    else
        printf "   └─ \033[1;36mInfo:\033[0m Index %s already exists\n" "$index_name"
    fi

    i=$((i + 1))
done

printf "   └─ \033[1;32mSuccess:\033[0m Indices set up successfully\n"