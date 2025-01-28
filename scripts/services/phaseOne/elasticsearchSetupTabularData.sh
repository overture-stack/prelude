#!/bin/sh

TEMPLATE_FILE="/usr/share/elasticsearch/config/tabular_data_index_template.json"
ES_URL="http://elasticsearch:9200"
AUTH="-u elastic:myelasticpassword"
INDEX_NAME="tabular-index"
TEMPLATE_NAME="tabular_template"
ALIAS_NAME="tabular_centric"

# Check template file
[ ! -f "$TEMPLATE_FILE" ] && printf "\033[1;31mError:\033[0m Template file not found at $TEMPLATE_FILE\n" && exit 1

# Set up template if it doesn't exist
printf "\033[1;36mConductor:\033[0m Setting up the Elasticsearch tabular index template\n"
if ! curl -s $AUTH "$ES_URL/_template/$TEMPLATE_NAME" | grep -q "\"index_patterns\""; then 
   curl -s $AUTH -X PUT "$ES_URL/_template/$TEMPLATE_NAME" \
       -H "Content-Type: application/json" -d @"$TEMPLATE_FILE" > /dev/null && \
   printf "\033[1;32mSuccess:\033[0m Elasticsearch tabular index template created successfully\n"
else
   printf "\033[1;36mElasticsearch (Tabular):\033[0m Tabular Index template already exists, skipping creation\n"
fi

# Create index with alias if it doesn't exist
printf "\033[1;36mConductor:\033[0m Setting up the Elasticsearch tabular index and alias\n"
if ! curl -s -f $AUTH -X GET "$ES_URL/$INDEX_NAME" > /dev/null 2>&1; then
   printf "\033[1;36mElasticsearch (Tabular):\033[0m Index does not exist, creating tabular index\n"
   response=$(curl -s -w "\n%{http_code}" $AUTH -X PUT "$ES_URL/$INDEX_NAME" \
       -H "Content-Type: application/json" \
       -d "{\"aliases\": {\"$ALIAS_NAME\": {}}}")
   
   http_code=$(echo "$response" | tail -n1)
   if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
       printf "\033[1;31mError:\033[0m Failed to create tabular index. HTTP Code: $http_code\n"
       exit 1
   fi
   printf "\033[1;32mSuccess:\033[0m Tabular index and alias created\n"
else
   printf "\033[1;36mElasticsearch (Tabular):\033[0m Tabular index already exists\n"
fi

printf "\033[1;32mSuccess:\033[0m Elasticsearch tabular setup complete\n"