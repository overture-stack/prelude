#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=15          
TIMEOUT=10              

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Object Storage:
1. Verify Object Storage service is running
2. Check network connectivity
3. Confirm correct Object Storage URL
4. Ensure firewall is not blocking connections
5. Review Object Storage service logs
6. Check system resource availability
7. Verify storage backend configuration
8. Confirm authentication and access credentials
"

printf "\033[1;36mConductor:\033[0m Checking if object storage is reachable\n"

until [ "$(curl -s --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$OBJECT_STORAGE_URL/minio/health/live")" = "200" ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n\033[1;31mError:\033[0m Failed to connect to object storage after %d attempts\n" "$MAX_RETRIES"
        
        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        
        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Object Storage URL: %s\n" "$OBJECT_STORAGE_URL"
        printf "Health Endpoint: %s/minio/health/live\n" "$OBJECT_STORAGE_URL"
        
        exit 1
    fi
    
    printf "\033[1;36mObject Storage:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Object storage is reachable\n"