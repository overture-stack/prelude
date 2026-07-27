#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=30          
TIMEOUT=10              

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Score:
1. Verify Score service is running
2. Check network connectivity
3. Confirm correct Score URL and authorization token
4. Ensure firewall is not blocking connections
5. Review Score service logs
6. Check system resource availability
"

printf "\033[1;36mSetup:\033[0m Checking if Score is reachable\n"

until [ "$(curl -s --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$SCORE_URL/download/ping" \
    -H "accept: */*" \
    -H "Authorization: 68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
    -H "User-Agent: unknown")" = "200" ]; do
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n\033[1;31mError:\033[0m Failed to connect to Score after %d attempts\n" "$MAX_RETRIES"
        
        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        
        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Score URL: %s\n" "$SCORE_URL"
        
        exit 1
    fi
    
    printf "\033[1;36mScore:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Score is now reachable\n"