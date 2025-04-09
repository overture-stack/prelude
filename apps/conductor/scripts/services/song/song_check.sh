#!/bin/sh

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=20          
TIMEOUT=10              

# Troubleshooting Tips
TROUBLESHOOTING_TIPS="
Troubleshooting Tips for Song:
1. Verify Song service is running
2. Check network connectivity
3. Confirm correct Song URL
4. Ensure firewall is not blocking connections
5. Review Song service logs
6. Check system resource availability
"

printf "\033[1;36mConductor:\033[0m Checking if Song is reachable\n"

until [ "$(curl -s --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "$SONG_URL/isAlive" \
    -H "accept: */*")" = "200" ]; do
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        printf "\n\033[1;31mError:\033[0m Failed to connect to Song after %d attempts\n" "$MAX_RETRIES"
        
        # Print troubleshooting tips
        printf "\n%s\n" "$TROUBLESHOOTING_TIPS"
        
        # Additional debug information
        printf "\n\033[1;33mAdditional Debug Information:\033[0m\n"
        printf "Song URL: %s\n" "$SONG_URL"
        
        exit 1
    fi
    
    printf "\033[1;36mSong:\033[0m Not reachable, retrying in %d seconds (Attempt %d/%d)\n" "$RETRY_DELAY" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m Song is now reachable\n"