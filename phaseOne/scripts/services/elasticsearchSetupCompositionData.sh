#!/bin/sh

# Check if template file exists
if [ ! -f "/usr/share/elasticsearch/config/composition_index_template.json" ]; then
    echo -e "\033[1;31mError:\033[0m Template file not found at /usr/share/elasticsearch/config/composition_index_template.json"
    exit 1
fi

# Set up Elasticsearch index template
echo -e "\033[1;36mConductor:\033[0m Setting up the Elasticsearch composition index template"
if ! curl -s -u elastic:myelasticpassword "http://elasticsearch:9200/_template/composition_template" | grep -q "\"index_patterns\""; then 
    curl -s -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/_template/composition_template" \
        -H "Content-Type: application/json" -d @/usr/share/elasticsearch/config/composition_index_template.json > /dev/null &&
    echo -e "\033[1;32mSuccess:\033[0m Elasticsearch composition index template created successfully"
else
    echo -e "\033[1;36mElasticsearch (Composition):\033[0m composition Index template already exists, skipping creation"
fi

# Set up Elasticsearch index and alias 
echo -e "\033[1;36mConductor:\033[0m Setting up the Elasticsearch composition index and alias"

# Check if index exists
if ! curl -s -f -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/composition-index" > /dev/null 2>&1; then
    echo -e "\033[1;36mElasticsearch (Composition):\033[0m Index does not exist, creating composition index"
    response=$(curl -s -w "\n%{http_code}" -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/composition-index" \
        -H "Content-Type: application/json" -d "{\"aliases\": {\"composition_centric\": {}}}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo -e "\033[1;31mError:\033[0m Failed to create composition index. Response: $body"
        exit 1
    fi
    echo -e "\033[1;32mSuccess:\033[0m composition index created"
else
    echo -e "\033[1;36mElasticsearch (Composition):\033[0m composition index already exists"
fi

# Check if alias exists
if ! curl -s -f -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/_alias/composition_centric" > /dev/null 2>&1; then
    echo -e "\033[1;36mElasticsearch (Composition):\033[0m Creating composition alias"
    response=$(curl -s -w "\n%{http_code}" -u elastic:myelasticpassword -X POST "http://elasticsearch:9200/composition-index/_alias/composition_centric" \
        -H "Content-Type: application/json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo -e "\033[1;31mError:\033[0m Failed to create composition alias. Response: $body"
        exit 1
    fi
    echo -e "\033[1;32mSuccess:\033[0m composition alias created"
else
    echo -e "\033[1;36mElasticsearch (Composition):\033[0m composition alias already exists"
fi

echo -e "\033[1;32mSuccess:\033[0m Elasticsearch composition setup complete"
