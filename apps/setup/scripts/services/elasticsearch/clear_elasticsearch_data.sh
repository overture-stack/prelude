#!/bin/sh

echo -e "\033[1;36mElasticsearch:\033[0m Clearing data from Elasticsearch"

if ! curl -s -X POST "$ES_URL/_all/_delete_by_query" \
     -H "Content-Type: application/json" \
     -u "$ES_AUTH" \
     -d '{"query": {"match_all": {}}}' > /dev/null; then
    echo -e "\033[1;31mError:\033[0m Failed to clear existing data"
    exit 1
fi

echo -e "\033[1;32mSuccess:\033[0m Index data cleared"