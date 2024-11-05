#!/bin/sh

# Wait for Elasticsearch
echo -e "\033[1;36mElasticsearch:\033[0m Starting up (this may take a few minutes)"
sleep 20
until curl -s -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/_cluster/health" > /dev/null; do
    echo -e "\033[1;36mElasticsearch:\033[0m Not yet reachable, checking again in 30 seconds"
    sleep 30
done
echo -e "\033[1;32mSuccess:\033[0m Elasticsearch is reachable"

# Set up Elasticsearch index template
echo -e "Setting up the Elasticsearch index template"
if ! curl -s -u elastic:myelasticpassword "http://elasticsearch:9200/_template/index_template" | grep -q "\"index_patterns\""; then 
    curl -s -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/_template/index_template" \
        -H "Content-Type: application/json" -d @/usr/share/elasticsearch/config/quickstart_index_template.json > /dev/null &&
    echo -e "\033[1;32mSuccess:\033[0m Elasticsearch index template created successfully"
else
    echo -e "\033[1;36mElasticsearch:\033[0m Index template already exists, skipping creation"
fi

# Set up Elasticsearch index and alias (needs failure check)
echo -e "Setting up the Elasticsearch index and alias"
echo -e "\033[1;36mElasticsearch:\033[0m Checking if Elasticsearch index exists"
if ! curl -s -f -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/overture-quickstart-index" > /dev/null 2>&1; then
    echo -e "\033[1;36mElasticsearch:\033[0m Creating Elasticsearch index and alias"
    response=$(curl -s -w "\n%{http_code}" -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/overture-quickstart-index" \
        -H "Content-Type: application/json" -d "{\"aliases\": {\"file_centric\": {\"is_write_index\": true}}}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    echo -e "\033[1;32mSuccess:\033[0m Index and alias created successfully, Elasticsearch setup complete"
else
    echo -e "\033[1;36mElasticsearch:\033[0m Index already exists, skipping creation"
fi      

# Importing Elasticsearch Documents
echo -e "Importing Elasticsearch Documents"
for f in ./es-docs/*.json; do
    object_id=$(basename "$f" .json)
    curl --user elastic:myelasticpassword -sL -X POST \
        -H "Content-Type: application/json" \
        "http://elasticsearch:9200/overture-quickstart-index/_doc/$object_id" \
        -d "@$f" > /dev/null
done
echo -e "\033[1;32mSuccess:\033[0m Document import complete"
