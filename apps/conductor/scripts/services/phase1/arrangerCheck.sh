#!/bin/sh

# Define configurations with environment variables and defaults
RETRY_DELAY="${RETRY_DELAY:-20}"
MAX_RETRIES="${MAX_RETRIES:-30}"

# Error handling tips function
show_troubleshooting_tips() {
    service_name="$1"
    echo -e "\033[1;33mTroubleshooting Tips for $service_name:\033[0m"
    echo "1. Verify the service URL is correct"
    echo "2. Check if the service is running and healthy"
    echo "3. Ensure network connectivity to the service"
    echo "4. Verify any required authentication is properly configured"
    echo "5. Check service logs for potential errors"
    echo "For additional support, contact the system administrator"
    echo
}

# Check Tabular Data Arranger
echo -e "\033[1;36mConductor:\033[0m Checking Tabular Data Arranger"
retry_count=0
until curl -s -o /dev/null -w "%{http_code}" "$ARRANGER_TABULAR_DATA_URL" | tr -d '/' | grep -q "200" || [ $retry_count -ge $MAX_RETRIES ]; do
    retry_count=$((retry_count + 1))
    if [ $retry_count -ge $MAX_RETRIES ]; then
        echo -e "\033[1;31mError:\033[0m Tabular Data Arranger is not reachable after $MAX_RETRIES attempts"
        show_troubleshooting_tips "Tabular Data Arranger"
        exit 1
    fi
    printf "Trying again in %d seconds... (Attempt %d/%d)\n" "$RETRY_DELAY" "$retry_count" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done
echo -e "\033[1;32mSuccess:\033[0m Tabular Data Arranger is reachable"