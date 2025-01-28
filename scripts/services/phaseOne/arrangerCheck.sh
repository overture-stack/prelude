#!/bin/sh

# Define configurations
RETRY_DELAY=20
ARRANGER_FILE_URL="http://arranger-file:5050/graphql"
ARRANGER_TABULAR_URL="http://arranger-tabular:5051/graphql"

# Check Arrangers
echo -e "Checking Arranger services"

# Check File Data Arranger
echo -e "\033[1;36mConductor:\033[0m Checking File Data Arranger"
until curl -s -o /dev/null -w "%{http_code}" "$ARRANGER_FILE_URL" | tr -d '/' | grep -q "200"; do
    printf "Trying again in %d seconds...\n" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done
echo -e "\033[1;32mSuccess:\033[0m File Data Arranger is reachable"

# Check Tabular Data Arranger
echo -e "\033[1;36mConductor:\033[0m Checking Tabular Data Arranger"
until curl -s -o /dev/null -w "%{http_code}" "$ARRANGER_TABULAR_URL" | tr -d '/' | grep -q "200"; do
    printf "Trying again in %d seconds...\n" "$RETRY_DELAY"
    sleep "$RETRY_DELAY"
done
echo -e "\033[1;32mSuccess:\033[0m Tabular Data Arranger is reachable"