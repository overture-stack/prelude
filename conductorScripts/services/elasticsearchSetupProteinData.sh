#!/bin/sh

# Check if template file exists
if [ ! -f "/usr/share/elasticsearch/config/protein_index_template.json" ]; then
    echo -e "\033[1;31mError:\033[0m Template file not found at /usr/share/elasticsearch/config/protein_index_template.json"
    exit 1
fi

# Set up Elasticsearch index template
echo -e "\033[1;36mConductor:\033[0m Setting up the Elasticsearch protein index template"
if ! curl -s -u elastic:myelasticpassword "http://elasticsearch:9200/_template/protein_template" | grep -q "\"index_patterns\""; then 
    curl -s -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/_template/protein_template" \
        -H "Content-Type: application/json" -d @/usr/share/elasticsearch/config/protein_index_template.json > /dev/null &&
    echo -e "\033[1;32mSuccess:\033[0m Elasticsearch protein index template created successfully"
else
    echo -e "\033[1;36mElasticsearch (protein):\033[0m protein Index template already exists, skipping creation"
fi

# Set up Elasticsearch index and alias 
echo -e "\033[1;36mConductor:\033[0m Setting up the Elasticsearch protein index and alias"

# Check if index exists
if ! curl -s -f -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/protein-index" > /dev/null 2>&1; then
    echo -e "\033[1;36mElasticsearch (protein):\033[0m Index does not exist, creating protein index"
    response=$(curl -s -w "\n%{http_code}" -u elastic:myelasticpassword -X PUT "http://elasticsearch:9200/protein-index" \
        -H "Content-Type: application/json" -d "{\"aliases\": {\"protein_centric\": {}}}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo -e "\033[1;31mError:\033[0m Failed to create protein index. Response: $body"
        exit 1
    fi
    echo -e "\033[1;32mSuccess:\033[0m protein index created"
else
    echo -e "\033[1;36mElasticsearch (protein):\033[0m protein index already exists"
fi

# Check if alias exists
if ! curl -s -f -u elastic:myelasticpassword -X GET "http://elasticsearch:9200/_alias/protein_centric" > /dev/null 2>&1; then
    echo -e "\033[1;36mElasticsearch (protein):\033[0m Creating protein alias"
    response=$(curl -s -w "\n%{http_code}" -u elastic:myelasticpassword -X POST "http://elasticsearch:9200/protein-index/_alias/protein_centric" \
        -H "Content-Type: application/json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo -e "\033[1;31mError:\033[0m Failed to create protein alias. Response: $body"
        exit 1
    fi
    echo -e "\033[1;32mSuccess:\033[0m protein alias created"
else
    echo -e "\033[1;36mElasticsearch (protein):\033[0m protein alias already exists"
fi

echo -e "\033[1;32mSuccess:\033[0m Elasticsearch protein setup complete"
